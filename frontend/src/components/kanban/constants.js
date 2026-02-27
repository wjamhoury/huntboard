export const COLUMNS = [
  { id: 'new', title: 'New', color: 'bg-blue-500' },
  { id: 'reviewing', title: 'Reviewing', color: 'bg-yellow-500' },
  { id: 'applied', title: 'Applied', color: 'bg-purple-500' },
  { id: 'interviewing', title: 'Interviewing', color: 'bg-orange-500' },
  { id: 'closed', title: 'Closed', color: 'bg-gray-500' },
  { id: 'archived', title: 'Archived', color: 'bg-slate-400', hideable: true },
]

export const CLOSED_STATUSES = ['rejected', 'offer']

export const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'offer', label: 'Offer' },
  { value: 'archived', label: 'Archived' },
]

export const isFollowUpDue = (followUpDate) => {
  if (!followUpDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const followUp = new Date(followUpDate)
  followUp.setHours(0, 0, 0, 0)
  return followUp <= today
}

export const formatFollowUpDate = (dateString) => {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const addDaysToToday = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}
