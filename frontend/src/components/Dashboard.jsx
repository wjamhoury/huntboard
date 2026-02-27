import { useState, useEffect } from 'react'
import {
  BarChart3,
  TrendingUp,
  Briefcase,
  Send,
  MessageSquare,
  Trophy,
  XCircle,
  Clock
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
import { analyticsApi } from '../services/api'

const STATUS_COLORS = {
  new: '#94a3b8',
  reviewing: '#3b82f6',
  applied: '#8b5cf6',
  interviewing: '#f59e0b',
  rejected: '#ef4444',
  offer: '#22c55e',
  archived: '#6b7280'
}

const SOURCE_COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4']

function Dashboard() {
  const [analytics, setAnalytics] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateRange, setDateRange] = useState(null) // null = all time

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    setIsLoading(true)
    try {
      const response = await analyticsApi.get(dateRange)
      setAnalytics(response.data)
      setError(null)
    } catch (err) {
      setError('Failed to load analytics')
      console.error('Error fetching analytics:', err)
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

  if (!analytics) return null

  const statusData = analytics.status_breakdown.map(item => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
    fill: STATUS_COLORS[item.status] || '#94a3b8'
  }))

  // Helper to truncate source names
  const truncateSource = (source, maxLen = 15) => {
    const formatted = source.charAt(0).toUpperCase() + source.slice(1)
    if (formatted.length <= maxLen) return formatted
    return formatted.substring(0, maxLen) + '...'
  }

  // Sort by count descending and limit to top 6 sources
  const sourceData = analytics.source_breakdown
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((item, index) => ({
      name: truncateSource(item.source),
      fullName: item.source.charAt(0).toUpperCase() + item.source.slice(1),
      value: item.count,
      fill: SOURCE_COLORS[index % SOURCE_COLORS.length]
    }))

  return (
    <div className="space-y-6 p-4">
      {/* Date Range Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="text-purple-600" size={24} />
          Analytics Dashboard
        </h2>
        <div className="flex gap-2">
          {[
            { label: '7 Days', value: 7 },
            { label: '30 Days', value: 30 },
            { label: '90 Days', value: 90 },
            { label: 'All Time', value: null }
          ].map(option => (
            <button
              key={option.label}
              onClick={() => setDateRange(option.value)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                dateRange === option.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Briefcase className="text-blue-500" size={20} />}
          label="Total Jobs"
          value={analytics.total_jobs}
          bgColor="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          icon={<Send className="text-purple-500" size={20} />}
          label="Applied"
          value={analytics.applied_count}
          subtitle={`${analytics.applied_percentage}% of total`}
          bgColor="bg-purple-50 dark:bg-purple-900/20"
        />
        <StatCard
          icon={<MessageSquare className="text-amber-500" size={20} />}
          label="Responses"
          value={analytics.response_count}
          subtitle={`${analytics.response_rate}% rate`}
          bgColor="bg-amber-50 dark:bg-amber-900/20"
        />
        <StatCard
          icon={<Trophy className="text-green-500" size={20} />}
          label="Offers"
          value={analytics.offer_count}
          bgColor="bg-green-50 dark:bg-green-900/20"
        />
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<Clock className="text-amber-500" size={20} />}
          label="Interviewing"
          value={analytics.interviewing_count}
          bgColor="bg-amber-50 dark:bg-amber-900/20"
        />
        <StatCard
          icon={<XCircle className="text-red-400 dark:text-red-300" size={20} />}
          label="Rejected"
          value={analytics.rejected_count}
          bgColor="bg-red-50 dark:bg-red-950/40"
        />
        <StatCard
          icon={<TrendingUp className="text-blue-500" size={20} />}
          label="Response Rate"
          value={`${analytics.response_rate}%`}
          bgColor="bg-blue-50 dark:bg-blue-900/20"
        />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Breakdown Pie Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
            Status Breakdown
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="35%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
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
        </div>

        {/* Source Breakdown Bar Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
            Jobs by Source {sourceData.length < analytics.source_breakdown.length && (
              <span className="text-xs text-slate-400 font-normal">(top {sourceData.length})</span>
            )}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={110}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    border: '1px solid var(--tooltip-border, #e2e8f0)',
                    borderRadius: '8px'
                  }}
                  formatter={(value, name, props) => [value, props.payload.fullName]}
                />
                <Bar dataKey="value" name="Jobs">
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Applications Over Time */}
      {analytics.applications_over_time.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
            Applications Over Time
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.applications_over_time}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return `${date.getMonth() + 1}/${date.getDate()}`
                  }}
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
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Applications"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Responses Over Time */}
      {analytics.responses_over_time.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
            Responses Over Time
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.responses_over_time}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return `${date.getMonth() + 1}/${date.getDate()}`
                  }}
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
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Responses"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
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

export default Dashboard
