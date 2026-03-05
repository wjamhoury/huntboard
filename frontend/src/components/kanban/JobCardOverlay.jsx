import { MapPin, DollarSign, Target, FileText, Bell } from 'lucide-react'
import { isFollowUpDue } from './constants'

const priorityColors = {
  1: 'border-l-red-500',
  2: 'border-l-orange-500',
  3: 'border-l-yellow-500',
  4: 'border-l-green-500',
  5: 'border-l-gray-400',
}

/**
 * A simplified job card component used as the drag overlay.
 * Shows a floating preview of the card being dragged.
 */
export default function JobCardOverlay({ job }) {
  const daysAgo = Math.floor((new Date() - new Date(job.created_at)) / (1000 * 60 * 60 * 24))
  const hasOverdueFollowUp = isFollowUpDue(job.follow_up_date)

  return (
    <div
      className={`bg-white dark:bg-slate-700 rounded-lg p-3 md:p-4 shadow-xl border-l-4 ${priorityColors[job.priority] || 'border-l-gray-400'} cursor-grabbing w-72 rotate-2 scale-105 ${hasOverdueFollowUp ? 'ring-2 ring-red-500 dark:ring-red-400' : ''}`}
      style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-slate-900 dark:text-white truncate">{job.title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 truncate">{job.company}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        {job.location && (
          <span className="flex items-center gap-1 truncate max-w-[120px]">
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
            >
              <Target size={10} />
              {job.match_score}
            </span>
          )}
          {job.resume && (
            <span className="flex items-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 p-1 rounded">
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
            >
              <Bell size={10} />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
