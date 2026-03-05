import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Briefcase,
  Send,
  TrendingUp,
  Calendar,
  Rss,
  Target,
  ArrowRight,
  ChevronRight,
  Star,
  Users,
  Activity,
  Shield,
  Zap
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { analyticsApi, adminApi } from '../services/api'
import { useAuth } from '../auth/AuthProvider'
import { SCORE_RANGE_COLORS } from '../utils/scoreColors'

// Admin email list - must match backend
const ADMIN_EMAILS = ['william.jamhoury@gmail.com']

const STATUS_COLORS = {
  new: '#94a3b8',
  saved: '#06b6d4',
  reviewing: '#3b82f6',
  applied: '#8b5cf6',
  interviewing: '#f59e0b',
  offer: '#22c55e',
  rejected: '#ef4444',
  archived: '#6b7280'
}

// Using SCORE_RANGE_COLORS from scoreColors utility for consistency

const SOURCE_COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4']

// Funnel statuses in order
const FUNNEL_STATUSES = ['new', 'reviewing', 'applied', 'interviewing', 'offer']

function Dashboard() {
  const [data, setData] = useState(null)
  const [adminStats, setAdminStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { userProfile } = useAuth()

  const isAdmin = userProfile?.email && ADMIN_EMAILS.includes(userProfile.email)

  useEffect(() => {
    fetchDashboardData()
  }, [isAdmin])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      const response = await analyticsApi.getDashboard()
      setData(response.data)

      // Fetch admin stats if user is admin
      if (isAdmin) {
        try {
          const adminResponse = await adminApi.getStats()
          setAdminStats(adminResponse.data)
        } catch (adminErr) {
          console.error('Error fetching admin stats:', adminErr)
          // Don't fail the whole dashboard if admin stats fail
        }
      }

      setError(null)
    } catch (err) {
      setError('Failed to load dashboard data')
      console.error('Error fetching dashboard data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">
        {error}
      </div>
    )
  }

  if (!data) return null

  // Build funnel data
  const funnelData = FUNNEL_STATUSES.map(status => {
    const found = data.status_breakdown.find(s => s.status === status)
    return {
      name: status.charAt(0).toUpperCase() + status.slice(1),
      status,
      count: found?.count || 0,
      fill: STATUS_COLORS[status]
    }
  })

  // Source breakdown for pie chart
  const sourceData = data.source_breakdown
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((item, index) => ({
      name: item.source.charAt(0).toUpperCase() + item.source.slice(1),
      value: item.count,
      fill: SOURCE_COLORS[index % SOURCE_COLORS.length]
    }))

  // Score distribution for histogram
  const scoreData = data.score_distribution.map(item => ({
    range: item.range,
    count: item.count,
    fill: SCORE_RANGE_COLORS[item.range] || '#94a3b8'
  }))

  // Format daily activity for chart
  const activityData = data.daily_activity.map(d => ({
    date: d.date,
    added: d.added,
    applied: d.applied
  }))

  // Format action for recent activities
  const formatAction = (action, detail) => {
    switch (action) {
      case 'created':
        return 'Added job'
      case 'status_change':
        if (detail) {
          const parts = detail.split(' -> ')
          return `Moved to ${parts[1] || detail}`
        }
        return 'Updated status'
      case 'note_added':
        return 'Added note'
      case 'scored':
        return 'AI scored'
      default:
        return action
    }
  }

  // Format relative time
  const formatTimeAgo = (isoString) => {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="text-purple-600" size={24} />
          Dashboard
        </h2>
      </div>

      {/* Admin Stats Section - Only shown for admin users */}
      {isAdmin && adminStats && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={20} />
            <h3 className="font-semibold">Admin Stats</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <AdminStatCard
              icon={<Users size={16} />}
              label="Total Users"
              value={adminStats.total_users}
            />
            <AdminStatCard
              icon={<Activity size={16} />}
              label="Active (7d)"
              value={adminStats.active_users_7d}
            />
            <AdminStatCard
              icon={<Activity size={16} />}
              label="Active (30d)"
              value={adminStats.active_users_30d}
            />
            <AdminStatCard
              icon={<Briefcase size={16} />}
              label="Total Jobs"
              value={adminStats.total_jobs}
            />
            <AdminStatCard
              icon={<Zap size={16} />}
              label="Total Syncs"
              value={adminStats.total_syncs}
            />
            <AdminStatCard
              icon={<Activity size={16} />}
              label="Events Today"
              value={adminStats.events_today}
            />
            <AdminStatCard
              icon={<Activity size={16} />}
              label="Events (7d)"
              value={adminStats.events_7d}
            />
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon={<Briefcase className="text-blue-500" size={20} />}
          label="Active Jobs"
          value={data.summary.total_active}
          bgColor="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          icon={<Send className="text-purple-500" size={20} />}
          label="Applied"
          value={data.summary.total_applied}
          bgColor="bg-purple-50 dark:bg-purple-900/20"
        />
        <StatCard
          icon={<Target className="text-green-500" size={20} />}
          label="Avg Score"
          value={data.summary.avg_score > 0 ? `${data.summary.avg_score}%` : '-'}
          bgColor="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          icon={<Calendar className="text-amber-500" size={20} />}
          label="Added This Week"
          value={data.summary.added_this_week}
          bgColor="bg-amber-50 dark:bg-amber-900/20"
        />
        <StatCard
          icon={<Rss className="text-cyan-500" size={20} />}
          label="Active Sources"
          value={data.summary.active_sources}
          bgColor="bg-cyan-50 dark:bg-cyan-900/20"
        />
      </div>

      {/* Application Funnel */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
          Application Funnel
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" />
              <YAxis
                dataKey="name"
                type="category"
                width={90}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg, #fff)',
                  border: '1px solid var(--tooltip-border, #e2e8f0)',
                  borderRadius: '8px'
                }}
                formatter={(value) => [value, 'Jobs']}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Jobs by Source Pie Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
            Jobs by Source
          </h3>
          {sourceData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="35%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--tooltip-bg, #fff)',
                      border: '1px solid var(--tooltip-border, #e2e8f0)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ paddingLeft: '20px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              No job sources yet
            </div>
          )}
        </div>

        {/* Score Distribution Histogram */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
            Score Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreData} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    border: '1px solid var(--tooltip-border, #e2e8f0)',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => [value, 'Jobs']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {scoreData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity Over Time */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
          Activity Over Time (Last 30 Days)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getMonth() + 1}/${date.getDate()}`
                }}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg, #fff)',
                  border: '1px solid var(--tooltip-border, #e2e8f0)',
                  borderRadius: '8px'
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="added"
                name="Jobs Added"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="applied"
                name="Applications"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Recent Activity
          </h3>
        </div>
        {data.recent_activities.length > 0 ? (
          <div className="space-y-3">
            {data.recent_activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                onClick={() => navigate(`/jobs/${activity.job_id}`)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Star size={14} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-900 dark:text-white truncate">
                      <span className="font-medium">{formatAction(activity.action, activity.detail)}</span>
                      {' '}
                      <span className="text-slate-500 dark:text-slate-400">
                        &quot;{activity.job_title}&quot; at {activity.company}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {formatTimeAgo(activity.created_at)}
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400">
            No recent activity
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, subtitle, bgColor }) {
  return (
    <div className={`${bgColor} rounded-lg p-4 border border-slate-200 dark:border-slate-700`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
      {subtitle && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</div>
      )}
    </div>
  )
}

function AdminStatCard({ icon, label, value }) {
  return (
    <div className="bg-white/10 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1 text-white/80">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  )
}

export default Dashboard
