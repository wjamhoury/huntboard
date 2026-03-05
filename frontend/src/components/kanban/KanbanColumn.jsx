import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Eye, EyeOff, MoreHorizontal, ArrowRight } from 'lucide-react'
import JobCard from './JobCard'
import { CLOSED_STATUSES } from './constants'

export default function KanbanColumn({
  column,
  jobs,
  onJobClick,
  isSelectMode,
  selectedJobs,
  onToggleSelect,
  isHidden,
  onToggleHidden,
  onArchiveAll,
  isExpanded,
  activeId,
  isDropTarget
}) {
  const [showMenu, setShowMenu] = useState(false)

  // Make the column a drop target
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  const columnJobs = jobs.filter((job) => {
    if (column.id === 'closed') {
      return CLOSED_STATUSES.includes(job.status)
    }
    if (column.id === 'archived') {
      return job.status === 'archived'
    }
    return job.status === column.id
  })

  // Collapsed state for hideable columns
  if (isHidden && column.hideable) {
    return (
      <div
        className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2 min-h-[500px] flex flex-col items-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors h-full"
        onClick={onToggleHidden}
        title={`Show ${column.title} (${columnJobs.length})`}
      >
        <div className={`w-3 h-3 rounded-full ${column.color} mb-2`} />
        <Eye size={16} className="text-slate-400 mb-2" />
        <span className="text-xs text-slate-500 dark:text-slate-400 writing-mode-vertical">
          {column.title}
        </span>
        <span className="mt-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-1.5 py-0.5 rounded-full">
          {columnJobs.length}
        </span>
      </div>
    )
  }

  // Determine if we should highlight as drop target
  const showDropHighlight = isDropTarget || isOver

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg p-3 md:p-4 min-h-[400px] md:min-h-[500px] flex flex-col h-full transition-colors duration-150 ${
        showDropHighlight
          ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400 ring-inset'
          : 'bg-slate-100 dark:bg-slate-800'
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${column.color}`} />
        <h2 className="font-semibold text-slate-700 dark:text-slate-200">{column.title}</h2>
        <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-1 rounded-full">
          {columnJobs.length}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {column.hideable && (
            <button
              onClick={onToggleHidden}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
              title="Hide column"
            >
              <EyeOff size={14} className="text-slate-400" />
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
            >
              <MoreHorizontal size={16} className="text-slate-400" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 z-50">
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      onArchiveAll(columnJobs.map(j => j.id), column.title)
                    }}
                    disabled={columnJobs.length === 0}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowRight size={14} />
                    Archive all in {column.title}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <SortableContext items={columnJobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 flex-1">
          {columnJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onClick={onJobClick}
              isSelectMode={isSelectMode}
              isSelected={selectedJobs.has(job.id)}
              onToggleSelect={onToggleSelect}
              isDragging={activeId === job.id}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
