import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Clock,
  RefreshCw,
  User,
  Bell,
  Save,
  Loader2,
  Linkedin,
  Mail,
  Code,
  Settings,
  Database,
  Download,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Info,
  RotateCcw,
  Key,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../auth/AuthProvider'
import { useSchedule, useUpdateSchedule, useBatchRuns } from '../hooks/useSync'
import { useMyFeeds } from '../hooks/useSources'
import {
  useUpdateProfile,
  useUpdatePreferences,
  useRerunOnboarding,
  useExportJobsCsv,
  useDeleteAllJobs,
  useDeleteAccount,
} from '../hooks/useSettings'
import ConfirmModal from '../components/ui/ConfirmModal'

const AUTH_METHOD_BADGES = {
  linkedin: {
    icon: Linkedin,
    label: 'Logged in via LinkedIn',
    className: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  },
  email: {
    icon: Mail,
    label: 'Email account',
    className: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  },
  dev: {
    icon: Code,
    label: 'Development mode',
    className: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
  },
}

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
  { value: 'score_desc', label: 'Highest score first' },
  { value: 'score_asc', label: 'Lowest score first' },
  { value: 'company_asc', label: 'Company A-Z' },
]

const APP_VERSION = '1.0.0'

const DIGEST_FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'never', label: 'Never' },
]

const DAY_OPTIONS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, userProfile, isDevMode, logout, refreshProfile } = useAuth()
  const { data: schedule, isLoading: scheduleLoading } = useSchedule()
  const { data: runs = [] } = useBatchRuns(0, 10)
  const { data: sources = [] } = useMyFeeds()
  const updateSchedule = useUpdateSchedule()

  // Mutations
  const updateProfile = useUpdateProfile()
  const updatePreferences = useUpdatePreferences()
  const rerunOnboarding = useRerunOnboarding()
  const exportCsv = useExportJobsCsv()
  const deleteAllJobs = useDeleteAllJobs()
  const deleteAccount = useDeleteAccount()

  // Local state
  const [displayName, setDisplayName] = useState('')
  const [scheduleForm, setScheduleForm] = useState({
    enabled: false,
    cron_expression: '0 8 * * *',
    auto_score: true,
  })
  const [preferences, setPreferences] = useState({
    default_sort: 'date_desc',
    auto_archive_days: 30,
    auto_archive_min_score: 0,
    email_digest: 'weekly',
    email_digest_min_score: 60,
    email_digest_day: 'monday',
  })
  const [targetRoles, setTargetRoles] = useState([])

  // Modal state
  const [showDeleteJobsModal, setShowDeleteJobsModal] = useState(false)
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // Initialize form state from profile
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.full_name || '')
      setTargetRoles(userProfile.target_job_titles || [])
      if (userProfile.preferences) {
        setPreferences(prev => ({
          ...prev,
          ...userProfile.preferences,
        }))
      }
    }
  }, [userProfile])

  // Initialize schedule form
  useEffect(() => {
    if (schedule) {
      setScheduleForm({
        enabled: schedule.enabled ?? false,
        cron_expression: schedule.cron_expression || '0 8 * * *',
        auto_score: schedule.auto_score ?? true,
      })
    }
  }, [schedule])

  const handleSaveProfile = async () => {
    await updateProfile.mutateAsync({ full_name: displayName })
    toast.success('Profile updated')
  }

  const handleSavePreferences = async () => {
    await updatePreferences.mutateAsync(preferences)
  }

  const handleSaveSchedule = async () => {
    try {
      await updateSchedule.mutateAsync(scheduleForm)
      toast.success('Schedule settings saved')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save schedule')
    }
  }

  const handleRerunWizard = async () => {
    await rerunOnboarding.mutateAsync()
    // Refresh the auth profile so ProtectedRoute sees the updated onboarding_complete=false
    await refreshProfile()
    navigate('/onboarding')
  }

  const handleExportData = async () => {
    await exportCsv.mutateAsync()
  }

  const handleDeleteAllJobs = async () => {
    await deleteAllJobs.mutateAsync()
    setShowDeleteJobsModal(false)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm')
      return
    }
    await deleteAccount.mutateAsync()
    await logout()
    navigate('/login')
  }

  const handleChangePassword = () => {
    navigate('/settings/change-password')
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString()
  }

  const activeSourcesCount = sources.filter(s => s.enabled).length

  return (
    <div className="p-4 pb-20 md:pb-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Settings</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Configure your HuntBoard preferences and account settings.
        </p>
      </div>

      <div className="space-y-6">
        {/* Setup Wizard */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <RotateCcw size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Setup Wizard</h2>
          </div>

          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
            Re-run the setup wizard to update your resume, change job sources, or start fresh.
          </p>

          <button
            onClick={handleRerunWizard}
            disabled={rerunOnboarding.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg"
          >
            {rerunOnboarding.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RotateCcw size={16} />
            )}
            Run Setup Wizard Again
          </button>
        </div>

        {/* User Profile */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <User size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Profile</h2>
          </div>

          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-white">
                {(displayName || user?.email || 'U').charAt(0).toUpperCase()}
              </span>
            </div>

            {/* User Info */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Display Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    placeholder="Your name"
                  />
                  <button
                    onClick={handleSaveProfile}
                    disabled={updateProfile.isPending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg"
                  >
                    {updateProfile.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <p className="text-slate-900 dark:text-white px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  {user?.email || 'Not set'}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Email cannot be changed
                </p>
              </div>

              {/* Auth Method Badge */}
              {user?.authMethod && AUTH_METHOD_BADGES[user.authMethod] && (
                <div className="pt-2">
                  {(() => {
                    const badge = AUTH_METHOD_BADGES[user.authMethod]
                    const Icon = badge.icon
                    return (
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${badge.className}`}>
                        <Icon size={16} />
                        {badge.label}
                      </span>
                    )
                  })()}
                </div>
              )}

              {/* Change Password */}
              {!isDevMode && user?.authMethod === 'email' && (
                <button
                  onClick={handleChangePassword}
                  className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  <Key size={16} />
                  Change Password
                </button>
              )}
            </div>
          </div>

          {isDevMode && (
            <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 rounded-lg text-sm">
              Running in dev mode - authentication is bypassed
            </div>
          )}
        </div>

        {/* Job Sources & Target Roles Link */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Sources & Target Roles</h2>
          </div>

          <p className="text-slate-600 dark:text-slate-400 mb-4">
            You have <span className="font-semibold text-slate-900 dark:text-white">{activeSourcesCount}</span> active {activeSourcesCount === 1 ? 'source' : 'sources'} and <span className="font-semibold text-slate-900 dark:text-white">{targetRoles.length}</span> target {targetRoles.length === 1 ? 'role' : 'roles'} configured.
          </p>

          <Link
            to="/import"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg"
          >
            <ExternalLink size={16} />
            Manage Sources & Target Roles
          </Link>
        </div>

        {/* Preferences */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Preferences</h2>
          </div>

          <div className="space-y-4">
            {/* Default Sort Order */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Default Sort Order
              </label>
              <select
                value={preferences.default_sort}
                onChange={(e) => setPreferences({ ...preferences, default_sort: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-Archive Settings */}
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-4">
              <div className="flex items-start gap-2">
                <Info size={16} className="text-slate-500 mt-0.5" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Auto-archive old jobs that haven't been updated and have a low match score.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Days without update
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={preferences.auto_archive_days}
                    onChange={(e) => setPreferences({ ...preferences, auto_archive_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-slate-500">0 = disabled</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Minimum score to archive
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={preferences.auto_archive_min_score}
                    onChange={(e) => setPreferences({ ...preferences, auto_archive_min_score: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-slate-500">Only archive if score &lt; this value (0 = disabled)</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSavePreferences}
              disabled={updatePreferences.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg"
            >
              {updatePreferences.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save Preferences
            </button>
          </div>
        </div>

        {/* Sync Schedule */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Sync Schedule</h2>
          </div>

          {scheduleLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="schedule-enabled"
                  checked={scheduleForm.enabled}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="schedule-enabled" className="text-slate-700 dark:text-slate-300">
                  Enable automatic sync
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Schedule (Cron Expression)
                </label>
                <input
                  type="text"
                  value={scheduleForm.cron_expression}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, cron_expression: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder="0 8 * * *"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Default: 0 8 * * * (8 AM daily)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="auto-score"
                  checked={scheduleForm.auto_score}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, auto_score: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="auto-score" className="text-slate-700 dark:text-slate-300">
                  Automatically score new jobs after sync
                </label>
              </div>

              <button
                onClick={handleSaveSchedule}
                disabled={updateSchedule.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg"
              >
                {updateSchedule.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Save Schedule
              </button>
            </div>
          )}
        </div>

        {/* Sync History */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <RefreshCw size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Sync History</h2>
          </div>

          {runs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="pb-2 font-medium">Started</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Jobs Added</th>
                    <th className="pb-2 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {runs.map((run, idx) => (
                    <tr key={idx}>
                      <td className="py-2 text-slate-700 dark:text-slate-300">
                        {formatDate(run.started_at)}
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          run.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : run.status === 'running'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {run.status}
                        </span>
                      </td>
                      <td className="py-2 text-slate-700 dark:text-slate-300">
                        {run.jobs_added || 0}
                      </td>
                      <td className="py-2 text-slate-500 dark:text-slate-400">
                        {run.duration ? `${run.duration}s` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-center py-8">
              No sync history yet
            </p>
          )}
        </div>

        {/* Data Management */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Data Management</h2>
          </div>

          <div className="space-y-4">
            {/* Export Data */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">Export My Data</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Download all your jobs as a CSV file</p>
              </div>
              <button
                onClick={handleExportData}
                disabled={exportCsv.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 rounded-lg"
              >
                {exportCsv.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                Export CSV
              </button>
            </div>

            {/* Delete All Jobs */}
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">Delete All Jobs</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Permanently delete all your saved jobs</p>
              </div>
              <button
                onClick={() => setShowDeleteJobsModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900 text-red-700 dark:text-red-300 rounded-lg"
              >
                <Trash2 size={16} />
                Delete Jobs
              </button>
            </div>

            {/* Delete Account */}
            <div className="flex items-center justify-between p-4 border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div>
                <h3 className="font-medium text-red-700 dark:text-red-400">Delete My Account</h3>
                <p className="text-sm text-red-600 dark:text-red-400">Permanently delete your account and all data</p>
              </div>
              <button
                onClick={() => setShowDeleteAccountModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                <AlertTriangle size={16} />
                Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Info size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">About</h2>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Version</span>
              <span className="text-slate-900 dark:text-white font-mono">{APP_VERSION}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Report a Bug</span>
              <a
                href="https://github.com/wjamhoury/huntboard/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
              >
                GitHub Issues
                <ExternalLink size={14} />
              </a>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400">
                Built by William Jamhoury
              </p>
            </div>
          </div>
        </div>

        {/* Email Digest Notifications */}
        <div id="notifications" className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Email Notifications</h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Receive email digests with new high-scoring job matches to stay on top of opportunities.
            </p>

            {/* Digest Frequency */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Digest Frequency
              </label>
              <select
                value={preferences.email_digest || 'weekly'}
                onChange={(e) => setPreferences({ ...preferences, email_digest: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                {DIGEST_FREQUENCY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Day selector - only show for weekly */}
            {preferences.email_digest === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Send On
                </label>
                <select
                  value={preferences.email_digest_day || 'monday'}
                  onChange={(e) => setPreferences({ ...preferences, email_digest_day: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  {DAY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Minimum score threshold */}
            {preferences.email_digest !== 'never' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Minimum Match Score
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={preferences.email_digest_min_score || 60}
                    onChange={(e) => setPreferences({ ...preferences, email_digest_min_score: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-slate-900 dark:text-white font-medium w-12 text-center">
                    {preferences.email_digest_min_score || 60}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Only include jobs with a match score at or above this threshold
                </p>
              </div>
            )}

            {preferences.email_digest !== 'never' && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info size={16} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {preferences.email_digest === 'daily'
                      ? 'You will receive a daily email at 8 AM UTC with new job matches.'
                      : `You will receive a weekly email every ${(preferences.email_digest_day || 'monday').charAt(0).toUpperCase() + (preferences.email_digest_day || 'monday').slice(1)} at 8 AM UTC.`}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleSavePreferences}
              disabled={updatePreferences.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg"
            >
              {updatePreferences.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save Email Preferences
            </button>

            {userProfile?.last_digest_sent && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Last digest sent: {formatDate(userProfile.last_digest_sent)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Delete Jobs Modal */}
      <ConfirmModal
        isOpen={showDeleteJobsModal}
        onClose={() => setShowDeleteJobsModal(false)}
        onConfirm={handleDeleteAllJobs}
        title="Delete All Jobs?"
        message="This will permanently delete all your saved jobs. This action cannot be undone."
        confirmText="Delete All Jobs"
        isLoading={deleteAllJobs.isPending}
        variant="danger"
      />

      {/* Delete Account Modal - Full-screen on mobile */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteAccountModal(false)}
          />
          <div className="relative bg-white dark:bg-slate-800 w-full md:max-w-md md:mx-4 rounded-t-2xl md:rounded-lg shadow-xl p-6 animate-slide-up md:animate-none safe-area-pb">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Delete Your Account?
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  This will permanently delete your account and all associated data including:
                </p>
                <ul className="mt-2 text-sm text-slate-600 dark:text-slate-400 list-disc list-inside space-y-1">
                  <li>All saved jobs</li>
                  <li>All uploaded resumes</li>
                  <li>All configured sources</li>
                  <li>Your profile and preferences</li>
                </ul>
                <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Type DELETE to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-3 md:py-2 text-base md:text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="DELETE"
              />
            </div>

            <div className="flex flex-col-reverse md:flex-row md:justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteAccountModal(false)
                  setDeleteConfirmText('')
                }}
                disabled={deleteAccount.isPending}
                className="w-full md:w-auto px-4 py-3 md:py-2 text-base md:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteAccount.isPending || deleteConfirmText !== 'DELETE'}
                className="w-full md:w-auto px-4 py-3 md:py-2 text-base md:text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed rounded-lg"
              >
                {deleteAccount.isPending ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
