import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  LinkIcon,
  SparklesIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import {
  useJobDetail,
  useJobActivities,
  useUpdateJobNotes,
  useUpdateJobStatusDetail,
  useScoreJob,
} from '../hooks/useJobDetail'

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'saved', label: 'Saved', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  { value: 'reviewing', label: 'Reviewing', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  { value: 'applied', label: 'Applied', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  { value: 'interviewing', label: 'Interviewing', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' },
  { value: 'offer', label: 'Offer', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  { value: 'archived', label: 'Archived', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' },
]

const TABS = [
  { id: 'description', label: 'Description', icon: DocumentTextIcon },
  { id: 'ai', label: 'AI Analysis', icon: SparklesIcon },
  { id: 'notes', label: 'Notes', icon: DocumentTextIcon },
  { id: 'activity', label: 'Activity', icon: ClockIcon },
]

function ScoreCircle({ score }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const progress = score ? (score / 100) * circumference : 0
  const strokeDashoffset = circumference - progress

  const getScoreColor = (s) => {
    if (s >= 80) return 'text-green-500'
    if (s >= 60) return 'text-yellow-500'
    if (s >= 40) return 'text-orange-500'
    return 'text-red-500'
  }

  const getStrokeColor = (s) => {
    if (s >= 80) return 'stroke-green-500'
    if (s >= 60) return 'stroke-yellow-500'
    if (s >= 40) return 'stroke-orange-500'
    return 'stroke-red-500'
  }

  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 transform -rotate-90">
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-gray-200 dark:text-gray-700"
        />
        {score !== null && score !== undefined && (
          <circle
            cx="48"
            cy="48"
            r={radius}
            strokeWidth="8"
            fill="transparent"
            strokeLinecap="round"
            className={getStrokeColor(score)}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.5s ease-in-out',
            }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {score !== null && score !== undefined ? (
          <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}%</span>
        ) : (
          <span className="text-sm text-gray-400">N/A</span>
        )}
      </div>
    </div>
  )
}

function SourceBadge({ source }) {
  const getBadgeStyle = (src) => {
    switch (src?.toLowerCase()) {
      case 'greenhouse':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'workday':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'lever':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'manual':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBadgeStyle(source)}`}>
      {source || 'Manual'}
    </span>
  )
}

function LocationBadges({ job }) {
  const badges = []
  if (job.is_remote) {
    badges.push(
      <span key="remote" className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
        Remote
      </span>
    )
  }
  if (job.is_hybrid) {
    badges.push(
      <span key="hybrid" className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
        Hybrid
      </span>
    )
  }
  return badges.length > 0 ? <div className="flex gap-2">{badges}</div> : null
}

function DescriptionTab({ job }) {
  const [expanded, setExpanded] = useState(false)
  const description = job.description || ''
  const isLong = description.length > 500
  const displayText = expanded || !isLong ? description : description.slice(0, 500) + '...'

  // Check if description contains HTML
  const containsHtml = /<[a-z][\s\S]*>/i.test(description)

  return (
    <div className="space-y-4">
      {containsHtml ? (
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: displayText }}
        />
      ) : (
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{displayText}</p>
      )}
      {isLong && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
        >
          Show more
        </button>
      )}
      {isLong && expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
        >
          Show less
        </button>
      )}
    </div>
  )
}

function AIAnalysisTab({ job, onScore, isScoring }) {
  const hasScore = job.match_score !== null && job.match_score !== undefined

  // Parse JSON fields
  let whyGoodFit = []
  let missingGaps = []

  try {
    whyGoodFit = job.why_good_fit ? JSON.parse(job.why_good_fit) : []
  } catch {
    whyGoodFit = job.why_good_fit ? [job.why_good_fit] : []
  }

  try {
    missingGaps = job.missing_gaps ? JSON.parse(job.missing_gaps) : []
  } catch {
    missingGaps = job.missing_gaps ? [job.missing_gaps] : []
  }

  if (!hasScore) {
    return (
      <div className="text-center py-8">
        <SparklesIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No AI Analysis Yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Get AI-powered insights on how well you match this job.
        </p>
        <button
          onClick={onScore}
          disabled={isScoring}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isScoring ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scoring...
            </>
          ) : (
            <>
              <SparklesIcon className="w-4 h-4 mr-2" />
              Score this job
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6">
        <ScoreCircle score={job.match_score} />
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Match Score</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Based on your resume and job requirements
          </p>
          {job.scored_at && (
            <p className="text-xs text-gray-400 mt-1">
              Scored on {new Date(job.scored_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {whyGoodFit.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center">
            <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
            Why You're a Good Fit
          </h4>
          <ul className="space-y-2">
            {whyGoodFit.map((reason, idx) => (
              <li key={idx} className="text-sm text-gray-600 dark:text-gray-300 flex items-start">
                <span className="text-green-500 mr-2">+</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {missingGaps.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 mr-2" />
            Potential Gaps
          </h4>
          <ul className="space-y-2">
            {missingGaps.map((gap, idx) => (
              <li key={idx} className="text-sm text-gray-600 dark:text-gray-300 flex items-start">
                <span className="text-yellow-500 mr-2">-</span>
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onScore}
          disabled={isScoring}
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium disabled:opacity-50"
        >
          {isScoring ? 'Re-scoring...' : 'Re-score job'}
        </button>
      </div>
    </div>
  )
}

function NotesTab({ job, onSave, isSaving }) {
  const [notes, setNotes] = useState(job.notes || '')
  const [hasChanges, setHasChanges] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    setNotes(job.notes || '')
    setHasChanges(false)
  }, [job.notes])

  const handleChange = (e) => {
    const value = e.target.value
    setNotes(value)
    setHasChanges(value !== (job.notes || ''))

    // Debounce auto-save
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      if (value !== (job.notes || '')) {
        onSave(value)
      }
    }, 1000)
  }

  const handleBlur = () => {
    if (hasChanges) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      onSave(notes)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Personal Notes
        </label>
        {isSaving && (
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
            <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Saving...
          </span>
        )}
        {!isSaving && hasChanges && (
          <span className="text-xs text-yellow-600 dark:text-yellow-400">Unsaved changes</span>
        )}
      </div>
      <textarea
        value={notes}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Add your notes about this job..."
        rows={8}
        className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
      />
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Notes auto-save after you stop typing or leave the field.
      </p>
    </div>
  )
}

function ActivityTab({ activities, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <ClockIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No activity recorded yet.</p>
      </div>
    )
  }

  const getActionLabel = (action) => {
    switch (action) {
      case 'created':
        return 'Job added'
      case 'status_change':
        return 'Status changed'
      case 'note_added':
        return 'Note updated'
      case 'scored':
        return 'AI scored'
      default:
        return action
    }
  }

  const getActionIcon = (action) => {
    switch (action) {
      case 'status_change':
        return '🔄'
      case 'note_added':
        return '📝'
      case 'scored':
        return '✨'
      case 'created':
        return '➕'
      default:
        return '•'
    }
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg"
        >
          <span className="text-lg">{getActionIcon(activity.action)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {getActionLabel(activity.action)}
            </p>
            {activity.detail && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 break-words">
                {activity.detail}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {new Date(activity.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function ApplyConfirmModal({ isOpen, onClose, onConfirm, isLoading }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Mark as Applied?
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          This will update the job status to "Applied" and record today's date.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
          >
            {isLoading ? 'Updating...' : 'Yes, mark as applied'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function JobDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('description')
  const [showApplyConfirm, setShowApplyConfirm] = useState(false)

  const { data: job, isLoading, error } = useJobDetail(id)
  const { data: activities, isLoading: activitiesLoading } = useJobActivities(id)
  const updateNotes = useUpdateJobNotes()
  const updateStatus = useUpdateJobStatusDetail()
  const scoreJob = useScoreJob()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      if (e.key === 'Escape') {
        navigate(-1)
      }

      // Number keys 1-8 for status changes
      const statusIndex = parseInt(e.key) - 1
      if (statusIndex >= 0 && statusIndex < STATUS_OPTIONS.length && job) {
        const newStatus = STATUS_OPTIONS[statusIndex].value
        if (newStatus !== job.status) {
          updateStatus.mutate({ id: job.id, status: newStatus })
          toast.success(`Status changed to ${STATUS_OPTIONS[statusIndex].label}`)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate, job, updateStatus])

  const handleApplyClick = () => {
    if (job.url) {
      window.open(job.url, '_blank')
    }
    // If not already applied, show confirmation
    if (job.status !== 'applied' && job.status !== 'interviewing' && job.status !== 'offer') {
      setShowApplyConfirm(true)
    }
  }

  const handleConfirmApply = () => {
    updateStatus.mutate(
      { id: job.id, status: 'applied' },
      {
        onSuccess: () => {
          toast.success('Marked as applied')
          setShowApplyConfirm(false)
        },
      }
    )
  }

  const handleSaveNotes = useCallback(
    (notes) => {
      updateNotes.mutate({ id: parseInt(id), notes })
    },
    [id, updateNotes]
  )

  const handleScore = () => {
    scoreJob.mutate(parseInt(id), {
      onSuccess: () => {
        toast.success('Job scored successfully')
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Job not found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">The job you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Go back
        </button>
      </div>
    )
  }

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === job.status) || STATUS_OPTIONS[0]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Back button and actions */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-1" />
              <span className="text-sm">Back</span>
            </button>
            {job.url && (
              <button
                onClick={handleApplyClick}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Apply
              </button>
            )}
          </div>

          {/* Job title and company */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{job.title}</h1>
              <div className="flex items-center gap-2 mt-1 text-gray-600 dark:text-gray-400">
                <BuildingOfficeIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{job.company}</span>
              </div>
              {job.location && (
                <div className="flex items-center gap-2 mt-1 text-gray-500 dark:text-gray-400 text-sm">
                  <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{job.location}</span>
                  <LocationBadges job={job} />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <SourceBadge source={job.source} />
                {job.created_at && (
                  <span className="text-xs text-gray-400 flex items-center">
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    Added {new Date(job.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Score and status */}
            <div className="flex items-center gap-4">
              <ScoreCircle score={job.match_score} />
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
                <select
                  value={job.status}
                  onChange={(e) => {
                    updateStatus.mutate({ id: job.id, status: e.target.value })
                    toast.success(`Status changed to ${e.target.options[e.target.selectedIndex].text}`)
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border-0 focus:ring-2 focus:ring-blue-500 cursor-pointer ${currentStatus.color}`}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-4 overflow-x-auto scrollbar-hide" aria-label="Tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab content */}
        <div className="py-6">
          {activeTab === 'description' && <DescriptionTab job={job} />}
          {activeTab === 'ai' && (
            <AIAnalysisTab job={job} onScore={handleScore} isScoring={scoreJob.isPending} />
          )}
          {activeTab === 'notes' && (
            <NotesTab job={job} onSave={handleSaveNotes} isSaving={updateNotes.isPending} />
          )}
          {activeTab === 'activity' && (
            <ActivityTab activities={activities} isLoading={activitiesLoading} />
          )}
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="hidden md:block fixed bottom-4 right-4 text-xs text-gray-400 dark:text-gray-500">
        <span className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded mr-2">Esc</span>Go back
        <span className="ml-4 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded mr-2">1-8</span>Change status
      </div>

      {/* Apply confirmation modal */}
      <ApplyConfirmModal
        isOpen={showApplyConfirm}
        onClose={() => setShowApplyConfirm(false)}
        onConfirm={handleConfirmApply}
        isLoading={updateStatus.isPending}
      />
    </div>
  )
}
