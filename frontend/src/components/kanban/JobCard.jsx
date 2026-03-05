import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MapPin, DollarSign, GripVertical, CheckSquare, Square, Target, FileText, Bell } from 'lucide-react'
import { isFollowUpDue, formatFollowUpDate } from './constants'

// Map source values to display labels
const SOURCE_LABELS = {
  manual: 'Manual',
  import_url: 'URL Import',
  imported: 'Imported',
  greenhouse: 'Greenhouse',
  workday: 'Workday',
  lever: 'Lever',
  google_jobs: 'Google Jobs',
}

function getSourceLabel(source) {
  if (!source) return null
  // Handle RSS sources (format: "rss:Feed Name")
  if (source.startsWith('rss:')) {
    return source.substring(4) // Return feed name
  }
  // Handle career page sources (format: "career_page:company_name")
  if (source.startsWith('career_page:')) {
    return 'Career Page'
  }
  return SOURCE_LABELS[source] || source
}

export default function JobCard({ job, onClick, isDragging, isSelectMode, isSelected, onToggleSelect }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: job.id, disabled: isSelectMode })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priorityColors = {
    1: 'border-l-red-500',
    2: 'border-l-orange-500',
    3: 'border-l-yellow-500',
    4: 'border-l-green-500',
    5: 'border-l-gray-400',
  }

  const daysAgo = Math.floor((new Date() - new Date(job.created_at)) / (1000 * 60 * 60 * 24))

  const handleClick = () => {
    if (isSelectMode) {
      onToggleSelect(job.id)
    } else {
      onClick(job)
    }
  }

  const hasOverdueFollowUp = isFollowUpDue(job.follow_up_date)

  // When this card is being dragged, show a placeholder
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-slate-200 dark:bg-slate-600 rounded-lg p-3 md:p-4 border-2 border-dashed border-slate-300 dark:border-slate-500 min-h-[80px]"
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-slate-700 rounded-lg p-3 md:p-4 shadow-sm border-l-4 ${priorityColors[job.priority] || 'border-l-gray-400'} cursor-pointer hover:shadow-md active:shadow-lg transition-shadow touch-manipulation ${isSelected ? 'ring-2 ring-blue-500' : ''} ${hasOverdueFollowUp ? 'ring-2 ring-red-500 dark:ring-red-400' : ''}`}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        {isSelectMode && (
          <div className="mr-3 flex-shrink-0">
            {isSelected ? (
              <CheckSquare size={20} className="text-blue-600" />
            ) : (
              <Square size={20} className="text-slate-400" />
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-slate-900 dark:text-white truncate" title={job.title}>{job.title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 truncate" title={job.company}>{job.company}</p>
          {job.source && job.source !== 'manual' && (
            <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400">
              {getSourceLabel(job.source)}
            </span>
          )}
        </div>
        {!isSelectMode && (
          <div
            {...attributes}
            {...listeners}
            className="p-1 cursor-grab hover:bg-slate-100 dark:hover:bg-slate-600 rounded ml-2"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={16} className="text-slate-400" />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        {job.location && (
          <span className="flex items-center gap-1 truncate max-w-[120px]" title={job.location}>
            <MapPin size={12} className="flex-shrink-0" />
            <span className="truncate">{job.location}</span>
          </span>
        )}
        {(job.salary_min || job.salary_max) && (
          <span className="flex items-center gap-1">
            <DollarSign size={12} />
            {job.salary_min && job.salary_max
              ? `${job.salary_min / 1000}k-${job.salary_max / 1000}k`
              : job.salary_min
              ? `${job.salary_min / 1000}k+`
              : `Up to ${job.salary_max / 1000}k`}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-slate-400">{daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}</span>
        <div className="flex items-center gap-1">
          {job.match_score != null && (
            <span
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-medium ${
                job.match_score >= 90
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : job.match_score >= 75
                  ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                  : job.match_score >= 50
                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                  : job.match_score >= 30
                  ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}
              title={(() => {
                let tip = `Match Score: ${job.match_score}/100`;
                try {
                  const fits = job.why_good_fit ? JSON.parse(job.why_good_fit) : [];
                  const gaps = job.missing_gaps ? JSON.parse(job.missing_gaps) : [];
                  if (fits.length) tip += `\n\nGood fit: ${fits.join('; ')}`;
                  if (gaps.length) tip += `\n\nGaps: ${gaps.join('; ')}`;
                } catch {}
                return tip;
              })()}
            >
              <Target size={10} />
              {job.match_score}
            </span>
          )}
          {job.resume && (
            <span
              className="flex items-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 p-1 rounded"
              title={`Resume: ${job.resume.original_filename}`}
            >
              <FileText size={9} />
            </span>
          )}
          {job.applied && (
            <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded">
              Applied
            </span>
          )}
          {job.follow_up_date && (
            <span
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                isFollowUpDue(job.follow_up_date)
                  ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                  : 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
              }`}
              title={`Follow-up: ${formatFollowUpDate(job.follow_up_date)}`}
            >
              <Bell size={10} />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
