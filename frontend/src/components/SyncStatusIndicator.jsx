import { useState, useEffect } from 'react'
import { Loader2, RefreshCw, Sparkles, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBatchStatus, useBatchRuns } from '../hooks/useSync'
import { useJobs } from '../hooks/useJobs'

/**
 * Shows sync status to the user with different states:
 * - First sync: "Importing jobs from your sources..."
 * - Subsequent syncs: "Syncing..." indicator
 * - Scoring: "Scoring jobs..."
 * - Completed: "Done! X jobs found" with link to triage
 */
export default function SyncStatusIndicator({ isFirstSync = false }) {
  const { data: batchStatus } = useBatchStatus()
  const { data: runs = [] } = useBatchRuns(0, 1)
  const { data: jobs = [] } = useJobs({ status: 'new', limit: 1 })

  const [showCompleted, setShowCompleted] = useState(false)
  const [wasRunning, setWasRunning] = useState(false)
  const [totalJobsFound, setTotalJobsFound] = useState(0)

  const isRunning = batchStatus?.is_running
  const lastRun = runs[0]

  // Track when sync completes
  useEffect(() => {
    if (isRunning) {
      setWasRunning(true)
    } else if (wasRunning && !isRunning) {
      // Sync just completed
      setShowCompleted(true)
      if (lastRun?.jobs_imported) {
        setTotalJobsFound(lastRun.jobs_imported)
      }
      // Auto-hide after 10 seconds
      const timeout = setTimeout(() => setShowCompleted(false), 10000)
      return () => clearTimeout(timeout)
    }
  }, [isRunning, wasRunning, lastRun])

  // For first sync, show a more prominent message
  if (isFirstSync && isRunning) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          </div>
          <div>
            <p className="text-blue-800 dark:text-blue-200 font-medium">
              Importing jobs from your sources...
            </p>
            <p className="text-blue-600 dark:text-blue-300 text-sm">
              This usually takes 2-3 minutes. Jobs will appear as they're found.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Sync completed message
  if (showCompleted && totalJobsFound > 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-green-800 dark:text-green-200 font-medium">
                Sync complete! Found {totalJobsFound} new {totalJobsFound === 1 ? 'job' : 'jobs'}.
              </p>
              {jobs.length > 0 && (
                <p className="text-green-600 dark:text-green-300 text-sm">
                  Start swiping to find your best matches.
                </p>
              )}
            </div>
          </div>
          {jobs.length > 0 && (
            <Link
              to="/triage"
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Sparkles size={16} />
              Start Triage
            </Link>
          )}
        </div>
      </div>
    )
  }

  // Regular sync in progress (subtle indicator)
  if (isRunning) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Syncing jobs...</span>
      </div>
    )
  }

  return null
}

/**
 * Compact sync indicator for sidebar/header
 */
export function SyncIndicatorCompact() {
  const { data: batchStatus } = useBatchStatus()

  if (!batchStatus?.is_running) return null

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
      <Loader2 className="w-3 h-3 animate-spin" />
      <span>Syncing...</span>
    </div>
  )
}
