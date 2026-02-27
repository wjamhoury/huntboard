import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, Loader2, Clock, Calendar, Play, Pause,
  Power, History, Timer, ChevronDown, ChevronUp, Sparkles,
  CheckSquare, Square, AlertCircle, X
} from 'lucide-react'
import { batchApi } from '../services/api'

function formatHour(hour) {
  if (hour === 0) return '12:00 AM'
  if (hour === 12) return '12:00 PM'
  if (hour < 12) return `${hour}:00 AM`
  return `${hour - 12}:00 PM`
}

function RunHistoryTable({ runs }) {
  const [expanded, setExpanded] = useState(false)
  if (!runs.length) return null
  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        <History size={12} />
        Recent Runs ({runs.length})
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {expanded && (
        <div className="mt-2 space-y-1">
          {runs.map(run => (
            <div key={run.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  run.status === 'completed' ? 'bg-green-500' :
                  run.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
                <span className="text-slate-600 dark:text-slate-300">
                  {new Date(run.started_at).toLocaleDateString()} {new Date(run.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-slate-400">{run.run_type.replace(/_/g, ' ')}</span>
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                {run.jobs_imported} imported, {run.jobs_scored} scored
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const SOURCE_TYPES = ['rss', 'greenhouse', 'workday', 'lever', 'google_jobs']

const SOURCE_TYPE_LABELS = {
  rss: 'RSS Feeds',
  greenhouse: 'Greenhouse',
  workday: 'Workday',
  lever: 'Lever',
  google_jobs: 'Google Jobs',
}

export default function SyncScheduleManager({ onSyncComplete }) {
  const [error, setError] = useState(null)
  const [syncResult, setSyncResult] = useState(null)

  // Schedule state
  const [schedule, setSchedule] = useState(null)
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [editingHour, setEditingHour] = useState(null)
  const [scheduleUpdating, setScheduleUpdating] = useState(false)
  const [recentRuns, setRecentRuns] = useState([])
  const [triggeringSync, setTriggeringSync] = useState(false)

  // Sync controls
  const [selectedTypes, setSelectedTypes] = useState(new Set(SOURCE_TYPES))
  const [scoreAfterSync, setScoreAfterSync] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  const fetchSchedule = useCallback(async () => {
    try {
      setScheduleLoading(true)
      const response = await batchApi.getSchedule()
      setSchedule(response.data)
    } catch (err) {
      console.error('Failed to load schedule:', err)
    } finally {
      setScheduleLoading(false)
    }
  }, [])

  const fetchRecentRuns = useCallback(async () => {
    try {
      const response = await batchApi.getRuns(0, 5)
      setRecentRuns(response.data.runs)
    } catch (err) {
      console.error('Failed to load run history:', err)
    }
  }, [])

  useEffect(() => {
    fetchSchedule()
    fetchRecentRuns()
  }, [fetchSchedule, fetchRecentRuns])

  const handleToggleSchedule = async () => {
    setScheduleUpdating(true)
    try {
      const response = await batchApi.updateSchedule({ enabled: !schedule.enabled })
      setSchedule(prev => ({ ...prev, ...response.data }))
    } catch (err) {
      setError('Failed to update schedule')
    } finally {
      setScheduleUpdating(false)
    }
  }

  const handleUpdateHour = async () => {
    if (editingHour === null || editingHour === schedule.hour) {
      setEditingHour(null)
      return
    }
    setScheduleUpdating(true)
    try {
      const response = await batchApi.updateSchedule({ hour: editingHour })
      setSchedule(prev => ({ ...prev, ...response.data }))
      setEditingHour(null)
    } catch (err) {
      setError('Failed to update schedule time')
    } finally {
      setScheduleUpdating(false)
    }
  }

  const handleTriggerFullSync = async () => {
    try {
      setTriggeringSync(true)
      await batchApi.trigger()
      setSyncResult({ message: 'Full sync started in background...', isRunning: true })

      const poll = setInterval(async () => {
        try {
          const statusRes = await batchApi.status()
          if (!statusRes.data.is_running) {
            clearInterval(poll)
            setTriggeringSync(false)
            setSyncResult({ message: 'Full sync completed!', isRunning: false })
            fetchSchedule()
            fetchRecentRuns()
            onSyncComplete?.()
            setTimeout(() => setSyncResult(null), 5000)
          }
        } catch {
          clearInterval(poll)
          setTriggeringSync(false)
        }
      }, 3000)
    } catch (err) {
      setTriggeringSync(false)
      if (err.response?.status === 409) {
        setError('A sync is already in progress')
      } else {
        setError('Failed to trigger sync')
      }
    }
  }

  const toggleType = (type) => {
    setSelectedTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const handleSync = async () => {
    if (selectedTypes.size === 0) return
    try {
      setIsSyncing(true)
      setSyncResult(null)
      await batchApi.selectiveSync(Array.from(selectedTypes), scoreAfterSync)
      setSyncResult({ message: `Syncing ${selectedTypes.size} source types in background...`, isRunning: true })

      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const statusRes = await batchApi.status()
          if (!statusRes.data.is_running) {
            clearInterval(poll)
            setIsSyncing(false)
            setSyncResult({ message: 'Sync completed!', isRunning: false })
            fetchSchedule()
            fetchRecentRuns()
            onSyncComplete?.()
            setTimeout(() => setSyncResult(null), 5000)
          }
        } catch {
          clearInterval(poll)
          setIsSyncing(false)
        }
      }, 3000)
    } catch (err) {
      setIsSyncing(false)
      setError(err.response?.data?.detail || 'Failed to start sync')
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 text-sm rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2"><AlertCircle size={16} />{error}</div>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {syncResult && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
          syncResult.isRunning
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
            : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200'
        }`}>
          {syncResult.isRunning ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {syncResult.message}
        </div>
      )}

      {/* Schedule Manager */}
      {!scheduleLoading && schedule && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Schedule Header */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-indigo-500" />
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                  Nightly Sync Schedule
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {schedule.enabled
                    ? `Runs daily at ${formatHour(schedule.hour)}`
                    : 'Currently disabled'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleTriggerFullSync}
                disabled={triggeringSync || isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
              >
                {triggeringSync ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                Run Now
              </button>
              <button
                onClick={handleToggleSchedule}
                disabled={scheduleUpdating}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  schedule.enabled
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}
              >
                {scheduleUpdating ? <Loader2 size={12} className="animate-spin" /> : schedule.enabled ? <Power size={12} /> : <Pause size={12} />}
                {schedule.enabled ? 'Active' : 'Paused'}
              </button>
            </div>
          </div>

          {/* Schedule Details */}
          <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* Time editor */}
              <div className="flex items-center gap-2 text-sm">
                <Timer size={14} className="text-slate-400" />
                {editingHour !== null ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={editingHour}
                      onChange={(e) => setEditingHour(parseInt(e.target.value))}
                      className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{formatHour(i)}</option>
                      ))}
                    </select>
                    <button onClick={handleUpdateHour} disabled={scheduleUpdating} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-xs font-medium">
                      Save
                    </button>
                    <button onClick={() => setEditingHour(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <span className="text-slate-600 dark:text-slate-300">
                    {formatHour(schedule.hour)}
                    <button
                      onClick={() => setEditingHour(schedule.hour)}
                      className="ml-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 text-xs"
                    >
                      Change
                    </button>
                  </span>
                )}
              </div>

              {/* Next run */}
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Calendar size={14} />
                {schedule.next_run_time
                  ? `Next: ${new Date(schedule.next_run_time).toLocaleString()}`
                  : 'No upcoming run'}
              </div>
            </div>

            {/* Last nightly sync summary */}
            {schedule.last_nightly_run && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <History size={12} />
                <span>
                  Last auto sync: {new Date(schedule.last_nightly_run.started_at).toLocaleString()}
                  {' \u2014 '}
                  <span className={schedule.last_nightly_run.status === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
                    {schedule.last_nightly_run.status}
                  </span>
                  {' \u2014 '}
                  {schedule.last_nightly_run.jobs_imported} imported, {schedule.last_nightly_run.jobs_scored} scored
                </span>
              </div>
            )}
            {/* Last run of any type */}
            {schedule.last_run && schedule.last_run.run_type !== 'nightly_sync' && (
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <History size={12} />
                <span>
                  Last manual sync: {new Date(schedule.last_run.started_at).toLocaleString()}
                  {' \u2014 '}
                  <span className={schedule.last_run.status === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
                    {schedule.last_run.status}
                  </span>
                  {' \u2014 '}
                  {schedule.last_run.jobs_imported} imported, {schedule.last_run.jobs_scored} scored
                </span>
              </div>
            )}

            {/* Recent runs */}
            <RunHistoryTable runs={recentRuns} />
          </div>
        </div>
      )}

      {/* Sync Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Manual Sync</h3>

        {/* Source type selection */}
        <div className="flex flex-wrap gap-2 mb-4">
          {SOURCE_TYPES.map(type => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                selectedTypes.has(type)
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-600'
                  : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
              }`}
            >
              {selectedTypes.has(type) ? <CheckSquare size={12} /> : <Square size={12} />}
              {SOURCE_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={scoreAfterSync}
              onChange={(e) => setScoreAfterSync(e.target.checked)}
              className="rounded border-slate-300"
            />
            <Sparkles size={14} className="text-teal-500" />
            Score jobs after import
          </label>
          <button
            onClick={handleSync}
            disabled={isSyncing || selectedTypes.size === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors font-medium"
          >
            {isSyncing ? (
              <><Loader2 size={18} className="animate-spin" />Syncing...</>
            ) : (
              <><RefreshCw size={18} />Sync Selected ({selectedTypes.size})</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
