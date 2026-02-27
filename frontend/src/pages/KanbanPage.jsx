import { useState, useEffect, useCallback, useRef } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import {
  Plus, RefreshCw, CheckSquare, ChevronDown, Link, Trash2, ArrowRight, Bell, Sparkles, Briefcase
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useJobs, useCreateJob, useUpdateJob, useDeleteJob, useBulkDeleteJobs, useBulkUpdateJobStatus } from '../hooks/useJobs'
import { useResumes } from '../hooks/useResumes'
import { useSelectiveSync, useScoreJobs, useBatchStatus } from '../hooks/useSync'
import { useJobFilters } from '../hooks/useJobFilters'
import { KanbanColumn, JobDetailPanel, AddJobModal, ImportUrlModal, COLUMNS, CLOSED_STATUSES, STATUS_OPTIONS, isFollowUpDue } from '../components/kanban'
import { SkeletonKanbanColumn } from '../components/ui/Skeleton'
import FilterBar from '../components/FilterBar'

export default function KanbanPage() {
  const [selectedJob, setSelectedJob] = useState(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importedJobData, setImportedJobData] = useState(null)
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedJobs, setSelectedJobs] = useState(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAddDropdown, setShowAddDropdown] = useState(false)
  const [showMoveDropdown, setShowMoveDropdown] = useState(false)
  const [showMoveConfirm, setShowMoveConfirm] = useState(null)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(null)
  const [showFollowUpFilter, setShowFollowUpFilter] = useState(false)
  const [hiddenColumns, setHiddenColumns] = useState(() => {
    const saved = localStorage.getItem('huntboard-hidden-columns')
    return saved ? JSON.parse(saved) : { archived: true }
  })
  const [activeColumnIndex, setActiveColumnIndex] = useState(0)
  const scrollContainerRef = useRef(null)

  // Get filters from URL params
  const { apiParams, hasActiveFilters } = useJobFilters()

  const { data: jobs = [], isLoading, refetch: refetchJobs } = useJobs(apiParams)
  const { data: resumes = [] } = useResumes()
  const { data: batchStatus } = useBatchStatus()

  const createJob = useCreateJob()
  const updateJob = useUpdateJob()
  const deleteJob = useDeleteJob()
  const bulkDeleteJobs = useBulkDeleteJobs()
  const bulkUpdateStatus = useBulkUpdateJobStatus()
  const selectiveSync = useSelectiveSync()
  const scoreJobs = useScoreJobs()

  const isSyncing = batchStatus?.is_running || selectiveSync.isPending
  const isScoring = scoreJobs.isPending

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return
      }

      switch (e.key) {
        case 'n':
          // 'n' opens new job modal
          if (!isAddModalOpen && !isImportModalOpen && !selectedJob) {
            e.preventDefault()
            setImportedJobData(null)
            setIsAddModalOpen(true)
          }
          break
        case 'Escape':
          // Escape closes any open modal/panel
          if (selectedJob) {
            setSelectedJob(null)
          } else if (isAddModalOpen) {
            setIsAddModalOpen(false)
            setImportedJobData(null)
          } else if (isImportModalOpen) {
            setIsImportModalOpen(false)
          } else if (isSelectMode) {
            setIsSelectMode(false)
            setSelectedJobs(new Set())
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isAddModalOpen, isImportModalOpen, selectedJob, isSelectMode])

  // Use TouchSensor with higher delay for mobile to allow scrolling
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  )

  // Get visible columns (not hidden)
  const visibleColumns = COLUMNS.filter(col => !hiddenColumns[col.id] || !col.hideable)

  // Scroll to column on mobile when tab is clicked
  const scrollToColumn = useCallback((index) => {
    const container = scrollContainerRef.current
    if (!container) return

    // Each column is 288px (w-72) + 16px gap
    const columnWidth = 304
    const scrollPosition = index * columnWidth

    container.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    })
    setActiveColumnIndex(index)
  }, [])

  // Track active column on scroll
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const columnWidth = 304
      const newIndex = Math.round(container.scrollLeft / columnWidth)
      if (newIndex !== activeColumnIndex && newIndex >= 0 && newIndex < visibleColumns.length) {
        setActiveColumnIndex(newIndex)
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [activeColumnIndex, visibleColumns.length])

  const stats = {
    total: jobs.length,
    new: jobs.filter((j) => j.status === 'new').length,
    applied: jobs.filter((j) => j.applied).length,
    interviewing: jobs.filter((j) => j.status === 'interviewing').length,
    followUpsDue: jobs.filter((j) => isFollowUpDue(j.follow_up_date)).length,
  }

  const displayedJobs = showFollowUpFilter
    ? jobs.filter((j) => isFollowUpDue(j.follow_up_date)).sort((a, b) => new Date(a.follow_up_date) - new Date(b.follow_up_date))
    : jobs

  const handleSyncAll = async () => {
    try {
      await selectiveSync.mutateAsync({
        sources: ['rss', 'greenhouse', 'workday', 'lever', 'google_jobs'],
        scoreAfter: true
      })
      toast.success('Sync started')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to sync')
    }
  }

  const handleScoreJobs = async (jobIds = null) => {
    try {
      const result = await scoreJobs.mutateAsync(jobIds)
      toast.success(result.message || 'Scoring started')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to score jobs')
    }
  }

  const handleAddJob = async (jobData) => {
    try {
      await createJob.mutateAsync(jobData)
      setIsAddModalOpen(false)
      setImportedJobData(null)
      toast.success('Job created')
    } catch (err) {
      toast.error('Failed to create job')
    }
  }

  const handleUpdateJob = async (id, updates) => {
    try {
      const result = await updateJob.mutateAsync({ id, data: updates })
      if (selectedJob?.id === id) {
        setSelectedJob(result)
      }
    } catch (err) {
      toast.error('Failed to update job')
    }
  }

  const handleDeleteJob = async (id) => {
    try {
      await deleteJob.mutateAsync(id)
      toast.success('Job deleted')
    } catch (err) {
      toast.error('Failed to delete job')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedJobs.size === 0) return
    try {
      await bulkDeleteJobs.mutateAsync(Array.from(selectedJobs))
      setSelectedJobs(new Set())
      setIsSelectMode(false)
      setShowDeleteConfirm(false)
      toast.success(`${selectedJobs.size} jobs deleted`)
    } catch (err) {
      toast.error('Failed to delete jobs')
    }
  }

  const handleBulkStatusChange = async (status) => {
    if (selectedJobs.size === 0) return
    try {
      await bulkUpdateStatus.mutateAsync({ ids: Array.from(selectedJobs), status })
      setSelectedJobs(new Set())
      setIsSelectMode(false)
      setShowMoveConfirm(null)
      toast.success(`${selectedJobs.size} jobs moved to ${status}`)
    } catch (err) {
      toast.error('Failed to update job statuses')
    }
  }

  const handleArchiveColumn = async (jobIds, columnTitle) => {
    if (jobIds.length === 0) return
    try {
      await bulkUpdateStatus.mutateAsync({ ids: jobIds, status: 'archived' })
      setShowArchiveConfirm(null)
      toast.success(`${jobIds.length} jobs archived`)
    } catch (err) {
      toast.error('Failed to archive jobs')
    }
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over) return

    const jobId = active.id
    const job = jobs.find((j) => j.id === jobId)
    if (!job) return

    for (const column of COLUMNS) {
      const columnJobs = jobs.filter((j) => {
        if (column.id === 'closed') return CLOSED_STATUSES.includes(j.status)
        if (column.id === 'archived') return j.status === 'archived'
        return j.status === column.id
      })

      if (columnJobs.some((j) => j.id === over.id) || column.id === over.id) {
        let newStatus = column.id
        if (column.id === 'closed') newStatus = 'rejected'
        if (job.status !== newStatus) {
          handleUpdateJob(jobId, { status: newStatus })
        }
        break
      }
    }
  }

  const toggleColumnHidden = (columnId) => {
    const newHidden = { ...hiddenColumns, [columnId]: !hiddenColumns[columnId] }
    setHiddenColumns(newHidden)
    localStorage.setItem('huntboard-hidden-columns', JSON.stringify(newHidden))
  }

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode)
    setSelectedJobs(new Set())
  }

  const handleToggleSelect = (jobId) => {
    const newSelected = new Set(selectedJobs)
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId)
    } else {
      newSelected.add(jobId)
    }
    setSelectedJobs(newSelected)
  }

  const handleImportedJob = (jobData) => {
    setImportedJobData(jobData)
    setIsAddModalOpen(true)
  }

  return (
    <div className="p-4 pb-20 md:pb-4">
      {/* Header Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Stats */}
        <div className="hidden lg:flex items-center gap-4 text-sm mr-4">
          <span className="text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-900 dark:text-white">{stats.total}</span> Total
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-blue-600">{stats.new}</span> New
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-purple-600">{stats.applied}</span> Applied
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-orange-600">{stats.interviewing}</span> Interviewing
          </span>
        </div>

        {/* Follow-up filter */}
        {stats.followUpsDue > 0 && (
          <button
            onClick={() => setShowFollowUpFilter(!showFollowUpFilter)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              showFollowUpFilter
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-200'
            }`}
          >
            <Bell size={18} />
            <span className="hidden sm:inline">Follow-ups</span>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
              showFollowUpFilter ? 'bg-red-500 text-white' : 'bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-200'
            }`}>
              {stats.followUpsDue}
            </span>
          </button>
        )}

        <div className="flex-1" />

        {/* Actions */}
        <button
          onClick={handleSyncAll}
          disabled={isSyncing || isSelectMode}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-2 rounded-lg transition-colors"
        >
          <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync All'}</span>
        </button>

        <button
          onClick={() => isSelectMode && selectedJobs.size > 0 ? handleScoreJobs(Array.from(selectedJobs)) : handleScoreJobs()}
          disabled={isScoring}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white px-3 py-2 rounded-lg transition-colors"
        >
          <Sparkles size={18} className={isScoring ? 'animate-pulse' : ''} />
          <span className="hidden sm:inline">{isScoring ? 'Scoring...' : isSelectMode && selectedJobs.size > 0 ? 'Score Selected' : 'Score'}</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowAddDropdown(!showAddDropdown)}
            disabled={isSelectMode}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add</span>
            <ChevronDown size={14} />
          </button>
          {showAddDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAddDropdown(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 z-50">
                <button
                  onClick={() => {
                    setShowAddDropdown(false)
                    setImportedJobData(null)
                    setIsAddModalOpen(true)
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-t-lg"
                >
                  <Plus size={18} />
                  Add Manually
                </button>
                <button
                  onClick={() => {
                    setShowAddDropdown(false)
                    setIsImportModalOpen(true)
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-b-lg border-t border-slate-200 dark:border-slate-600"
                >
                  <Link size={18} />
                  Import from URL
                </button>
              </div>
            </>
          )}
        </div>

        <button
          onClick={toggleSelectMode}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            isSelectMode
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
          }`}
        >
          <CheckSquare size={18} />
          <span className="hidden sm:inline">{isSelectMode ? 'Exit' : 'Select'}</span>
        </button>
      </div>

      {/* Follow-up Filter Active Banner */}
      {showFollowUpFilter && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={20} />
            <span>
              Showing <strong>{stats.followUpsDue}</strong> job{stats.followUpsDue !== 1 ? 's' : ''} due for follow-up
            </span>
          </div>
          <button
            onClick={() => setShowFollowUpFilter(false)}
            className="px-3 py-1 bg-red-200 dark:bg-red-800 hover:bg-red-300 dark:hover:bg-red-700 rounded-lg text-sm transition-colors"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar showQuickFilters={true} />

      {/* Mobile Column Tabs */}
      {!isLoading && jobs.length > 0 && (
        <div className="md:hidden mb-3 -mx-4 px-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 min-w-max">
            {visibleColumns.map((column, index) => {
              const columnJobs = displayedJobs.filter((job) => {
                if (column.id === 'closed') return CLOSED_STATUSES.includes(job.status)
                if (column.id === 'archived') return job.status === 'archived'
                return job.status === column.id
              })
              return (
                <button
                  key={column.id}
                  onClick={() => scrollToColumn(index)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeColumnIndex === index
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${column.color}`} />
                  {column.title}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeColumnIndex === index
                      ? 'bg-blue-200 dark:bg-blue-800'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`}>
                    {columnJobs.length}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex flex-col md:flex-row gap-4">
          {COLUMNS.filter(col => !hiddenColumns[col.id] || !col.hideable).map((col) => (
            <SkeletonKanbanColumn key={col.id} />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Briefcase size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            No jobs yet
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-6 max-w-md">
            Start tracking your job search by adding jobs manually or importing from job boards.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => { setImportedJobData(null); setIsAddModalOpen(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus size={18} />
              Add Job
            </button>
            <button
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors"
            >
              <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
              Sync from Feeds
            </button>
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {/* Responsive Kanban: horizontal scroll with snap on mobile, flex row on desktop */}
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-hidden snap-x snap-mandatory scroll-smooth md:snap-none scrollbar-hide"
          >
            <div className="flex gap-4 min-w-max md:min-w-0 md:w-full">
              {COLUMNS.map((column) => {
                const isColumnHidden = hiddenColumns[column.id] && column.hideable
                return (
                  <div
                    key={column.id}
                    className={`snap-start flex-shrink-0 md:flex-shrink ${
                      isColumnHidden
                        ? 'w-12 hidden md:block'
                        : 'w-72 md:w-auto md:flex-1 md:min-w-[180px]'
                    }`}
                  >
                    <KanbanColumn
                      column={column}
                      jobs={displayedJobs}
                      onJobClick={setSelectedJob}
                      isSelectMode={isSelectMode}
                      selectedJobs={selectedJobs}
                      onToggleSelect={handleToggleSelect}
                      isHidden={hiddenColumns[column.id]}
                      onToggleHidden={() => toggleColumnHidden(column.id)}
                      onArchiveAll={(ids, title) => setShowArchiveConfirm({ ids, title })}
                      isExpanded={!hiddenColumns[column.id] || !column.hideable}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </DndContext>
      )}

      {/* Modals */}
      <AddJobModal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setImportedJobData(null) }}
        onSubmit={handleAddJob}
        initialData={importedJobData}
      />
      <ImportUrlModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportedJob}
      />

      {selectedJob && !isSelectMode && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setSelectedJob(null)} />
          <JobDetailPanel
            job={selectedJob}
            onClose={() => setSelectedJob(null)}
            onUpdate={handleUpdateJob}
            onDelete={handleDeleteJob}
            resumes={resumes}
          />
        </>
      )}

      {/* Floating Action Bar for Select Mode */}
      {isSelectMode && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-64 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-lg z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              {selectedJobs.size} selected
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setIsSelectMode(false); setSelectedJobs(new Set()) }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowMoveDropdown(!showMoveDropdown)}
                  disabled={selectedJobs.size === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <ArrowRight size={18} />
                  Move to...
                  <ChevronDown size={16} />
                </button>
                {showMoveDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMoveDropdown(false)} />
                    <div className="absolute bottom-full mb-2 right-0 w-48 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 z-50">
                      {STATUS_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setShowMoveDropdown(false)
                            setShowMoveConfirm(option)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 first:rounded-t-lg last:rounded-b-lg"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={selectedJobs.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <Trash2 size={18} />
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Delete {selectedJobs.size} jobs?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleteJobs.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Confirmation Modal */}
      {showMoveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Move {selectedJobs.size} jobs to {showMoveConfirm.label}?
            </h3>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowMoveConfirm(null)}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBulkStatusChange(showMoveConfirm.value)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <ArrowRight size={18} />
                Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Column Confirmation Modal */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Archive all jobs in {showArchiveConfirm.title}?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              This will move {showArchiveConfirm.ids.length} jobs to the Archived column.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowArchiveConfirm(null)}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleArchiveColumn(showArchiveConfirm.ids, showArchiveConfirm.title)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                <ArrowRight size={18} />
                Archive All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
