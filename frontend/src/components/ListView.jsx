import { useState, useMemo, useCallback } from 'react'
import {
  ChevronUp,
  ChevronDown,
  Archive,
  ExternalLink,
  Target,
} from 'lucide-react'
import { getScoreBadgeClasses } from '../utils/scoreColors'

const STATUSES = ['new', 'saved', 'reviewing', 'applied', 'interviewing', 'offer', 'rejected', 'archived']

const PRIORITY_COLORS = {
  1: 'bg-red-500',
  2: 'bg-orange-500',
  3: 'bg-yellow-500',
  4: 'bg-green-500',
  5: 'bg-gray-400',
}

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-200',
  reviewing: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-200',
  applied: 'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-200',
  interviewing: 'bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-200',
  offer: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-200',
  archived: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400',
}

// Helper to check if follow-up is due
const isFollowUpDue = (followUpDate) => {
  if (!followUpDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const followUp = new Date(followUpDate)
  followUp.setHours(0, 0, 0, 0)
  return followUp <= today
}

// Helper for relative date
const getRelativeDate = (dateStr) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffTime = now - date
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return '1d ago'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

// Format source for display
const formatSource = (source) => {
  if (!source) return 'Manual'
  if (source.startsWith('rss:')) return 'RSS'
  return source.charAt(0).toUpperCase() + source.slice(1)
}

// Format salary range
const formatSalary = (min, max) => {
  if (!min && !max) return '-'
  if (min && max) return `$${(min / 1000).toFixed(0)}k-$${(max / 1000).toFixed(0)}k`
  if (min) return `$${(min / 1000).toFixed(0)}k+`
  return `Up to $${(max / 1000).toFixed(0)}k`
}

// Load preferences from localStorage (only sort preferences now)
const loadPreferences = () => {
  try {
    const saved = localStorage.getItem('huntboard-listview-prefs')
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        sortColumn: parsed.sortColumn || 'created_at',
        sortDirection: parsed.sortDirection || 'desc',
      }
    }
  } catch (e) {
    console.error('Error loading list view preferences:', e)
  }
  return {
    sortColumn: 'created_at',
    sortDirection: 'desc',
  }
}

// Save preferences to localStorage
const savePreferences = (prefs) => {
  try {
    localStorage.setItem('huntboard-listview-prefs', JSON.stringify(prefs))
  } catch (e) {
    console.error('Error saving list view preferences:', e)
  }
}

function ListView({
  jobs,
  onJobClick,
  onUpdateJob,
}) {
  const [prefs, setPrefs] = useState(loadPreferences)
  const [hoveredRow, setHoveredRow] = useState(null)

  const updatePrefs = useCallback((updates) => {
    setPrefs((prev) => {
      const newPrefs = { ...prev, ...updates }
      savePreferences(newPrefs)
      return newPrefs
    })
  }, [])

  // Sort jobs (filtering is done via URL params in the parent component)
  const sortedJobs = useMemo(() => {
    let result = [...jobs]

    // Sort
    result.sort((a, b) => {
      let aVal, bVal

      switch (prefs.sortColumn) {
        case 'title':
          aVal = a.title.toLowerCase()
          bVal = b.title.toLowerCase()
          break
        case 'company':
          aVal = a.company.toLowerCase()
          bVal = b.company.toLowerCase()
          break
        case 'location':
          aVal = (a.location || '').toLowerCase()
          bVal = (b.location || '').toLowerCase()
          break
        case 'salary':
          aVal = a.salary_min || a.salary_max || 0
          bVal = b.salary_min || b.salary_max || 0
          break
        case 'status':
          aVal = STATUSES.indexOf(a.status)
          bVal = STATUSES.indexOf(b.status)
          break
        case 'source':
          aVal = formatSource(a.source).toLowerCase()
          bVal = formatSource(b.source).toLowerCase()
          break
        case 'priority':
          aVal = a.priority || 3
          bVal = b.priority || 3
          break
        case 'match_score':
          aVal = a.match_score || 0
          bVal = b.match_score || 0
          break
        case 'created_at':
        default:
          aVal = new Date(a.created_at).getTime()
          bVal = new Date(b.created_at).getTime()
          break
      }

      if (aVal < bVal) return prefs.sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return prefs.sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [jobs, prefs])

  const handleSort = (column) => {
    if (prefs.sortColumn === column) {
      updatePrefs({ sortDirection: prefs.sortDirection === 'asc' ? 'desc' : 'asc' })
    } else {
      updatePrefs({ sortColumn: column, sortDirection: 'asc' })
    }
  }

  const handleStatusChange = async (job, newStatus) => {
    try {
      await onUpdateJob(job.id, { status: newStatus })
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  const handlePriorityChange = async (job) => {
    const newPriority = job.priority >= 5 ? 1 : (job.priority || 3) + 1
    try {
      await onUpdateJob(job.id, { priority: newPriority })
    } catch (err) {
      console.error('Error updating priority:', err)
    }
  }

  const handleArchive = async (job, e) => {
    e.stopPropagation()
    try {
      await onUpdateJob(job.id, { status: 'archived' })
    } catch (err) {
      console.error('Error archiving job:', err)
    }
  }

  const SortHeader = ({ column, children, className = '' }) => (
    <th
      className={`px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 select-none ${className}`}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {prefs.sortColumn === column && (
          <span className="text-purple-600 dark:text-purple-400">
            {prefs.sortDirection === 'asc' ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </span>
        )}
      </div>
    </th>
  )

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
      {/* Results Count Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {sortedJobs.length} jobs
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          Click column headers to sort
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
            <tr>
              {/* Priority */}
              <SortHeader column="priority" className="w-16">
                Pri
              </SortHeader>
              {/* Match Score */}
              <SortHeader column="match_score" className="w-16">
                Match
              </SortHeader>
              {/* Title */}
              <SortHeader column="title" className="min-w-[200px]">
                Title
              </SortHeader>
              {/* Company */}
              <SortHeader column="company" className="min-w-[150px]">
                Company
              </SortHeader>
              {/* Location */}
              <SortHeader column="location" className="min-w-[120px]">
                Location
              </SortHeader>
              {/* Salary */}
              <SortHeader column="salary" className="min-w-[100px]">
                Salary
              </SortHeader>
              {/* Status */}
              <SortHeader column="status" className="min-w-[120px]">
                Status
              </SortHeader>
              {/* Source - hidden on small screens */}
              <SortHeader column="source" className="min-w-[100px] hidden lg:table-cell">
                Source
              </SortHeader>
              {/* Date Added - hidden on small screens */}
              <SortHeader column="created_at" className="min-w-[80px] hidden md:table-cell">
                Added
              </SortHeader>
              {/* Actions */}
              <th className="w-20 px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {sortedJobs.map((job, index) => {
              const isHovered = hoveredRow === job.id
              const hasFollowUpDue = isFollowUpDue(job.follow_up_date)
              const isArchived = job.status === 'archived'

              // Determine left border color
              let leftBorderClass = 'border-l-4 border-l-transparent'
              if (hasFollowUpDue) {
                leftBorderClass = 'border-l-4 border-l-red-500'
              } else if (job.applied) {
                leftBorderClass = 'border-l-4 border-l-green-500'
              }

              return (
                <tr
                  key={job.id}
                  className={`
                    ${leftBorderClass}
                    ${index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/50'}
                    ${isHovered ? 'bg-slate-100 dark:bg-slate-700' : ''}
                    ${isArchived ? 'opacity-60' : ''}
                    cursor-pointer transition-colors
                  `}
                  onMouseEnter={() => setHoveredRow(job.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() => onJobClick(job)}
                >
                  {/* Priority */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handlePriorityChange(job)}
                      className={`w-4 h-4 rounded-full ${PRIORITY_COLORS[job.priority || 3]} hover:ring-2 hover:ring-offset-2 hover:ring-slate-400 transition-all`}
                      title={`Priority ${job.priority || 3} - Click to change`}
                    />
                  </td>

                  {/* Match Score */}
                  <td className="px-4 py-3">
                    {job.match_score ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getScoreBadgeClasses(job.match_score)}`}
                        title={`Match Score: ${job.match_score}/100`}
                      >
                        <Target size={12} />
                        {job.match_score}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>

                  {/* Title */}
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900 dark:text-white">
                      {job.title}
                    </span>
                  </td>

                  {/* Company */}
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {job.company}
                  </td>

                  {/* Location */}
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {job.location || '-'}
                  </td>

                  {/* Salary */}
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm">
                    {formatSalary(job.salary_min, job.salary_max)}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={job.status}
                      onChange={(e) => handleStatusChange(job, e.target.value)}
                      className={`px-2 py-1 text-xs font-medium rounded-full border-0 cursor-pointer ${STATUS_COLORS[job.status]} focus:ring-2 focus:ring-purple-500`}
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Source - hidden on small screens */}
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm hidden lg:table-cell">
                    {formatSource(job.source)}
                  </td>

                  {/* Date Added - hidden on small screens */}
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm hidden md:table-cell">
                    {getRelativeDate(job.created_at)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {job.status !== 'archived' && (
                        <button
                          onClick={(e) => handleArchive(job, e)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition-colors"
                          title="Archive"
                        >
                          <Archive size={16} />
                        </button>
                      )}
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition-colors"
                          title="Open job posting"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {sortedJobs.length === 0 && (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            No jobs found matching your filters
          </div>
        )}
      </div>
    </div>
  )
}

export default ListView
