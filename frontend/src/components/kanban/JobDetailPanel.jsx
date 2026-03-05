import { useState, useEffect } from 'react'
import {
  X, Pencil, Save, Loader2, ExternalLink, FileText, Wand2, Target, Bell, CheckSquare, Square, Trash2, Check
} from 'lucide-react'
import { aiApi } from '../../services/api'
import PromptModal from '../PromptModal'
import { ConfirmModal } from '../ui'
import { isFollowUpDue, addDaysToToday } from './constants'
import { getScoreTextClasses } from '../../utils/scoreColors'

export default function JobDetailPanel({ job, onClose, onUpdate, onDelete, resumes = [] }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState(job)
  const [promptModal, setPromptModal] = useState({ isOpen: false, title: '', prompt: '' })
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    setEditData(job)
    setIsEditing(false)
  }, [job])

  if (!job) return null

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleResumeChange = async (resumeId) => {
    try {
      await onUpdate(job.id, { resume_id: resumeId || null })
      showToast(resumeId ? 'Resume linked' : 'Resume unlinked')
    } catch (err) {
      showToast('Failed to update resume', 'error')
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onUpdate(job.id, editData)
      setIsEditing(false)
      showToast('Changes saved successfully')
    } catch (err) {
      showToast('Failed to save changes', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditData(job)
    setIsEditing(false)
  }

  const handleStatusChange = async (newStatus) => {
    try {
      await onUpdate(job.id, { status: newStatus })
      showToast('Status updated')
    } catch (err) {
      showToast('Failed to update status', 'error')
    }
  }

  const handlePriorityChange = async (newPriority) => {
    try {
      await onUpdate(job.id, { priority: parseInt(newPriority) })
      showToast('Priority updated')
    } catch (err) {
      showToast('Failed to update priority', 'error')
    }
  }

  const handleAppliedChange = async (applied) => {
    try {
      await onUpdate(job.id, { applied })
      showToast(applied ? 'Marked as applied' : 'Unmarked as applied')
    } catch (err) {
      showToast('Failed to update', 'error')
    }
  }

  const handleGenerateCoverLetter = async () => {
    try {
      setIsGenerating(true)
      const response = await aiApi.getCoverLetterPrompt(job.id)
      setPromptModal({
        isOpen: true,
        title: 'Cover Letter Prompt',
        prompt: response.data.prompt,
        jobTitle: response.data.job_title,
        company: response.data.company,
      })
    } catch (err) {
      console.error('Error generating cover letter prompt:', err)
      showToast(err.response?.data?.detail || 'Failed to generate prompt', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleTailorResume = async () => {
    try {
      setIsGenerating(true)
      const response = await aiApi.getResumeTailorPrompt(job.id)
      setPromptModal({
        isOpen: true,
        title: 'Resume Tailoring Prompt',
        prompt: response.data.prompt,
        jobTitle: response.data.job_title,
        company: response.data.company,
      })
    } catch (err) {
      console.error('Error generating resume tailor prompt:', err)
      showToast(err.response?.data?.detail || 'Failed to generate prompt', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleMatchAnalysis = async () => {
    try {
      setIsGenerating(true)
      const response = await aiApi.getMatchAnalysis(job.id)
      setPromptModal({
        isOpen: true,
        title: 'Resume Match Analysis Prompt',
        prompt: response.data.prompt,
        jobTitle: response.data.job_title,
        company: response.data.company,
        subtitle: `Analyzing ${response.data.resumes_analyzed.length} resume(s)`,
      })
    } catch (err) {
      console.error('Error generating match analysis prompt:', err)
      showToast(err.response?.data?.detail || 'Failed to generate prompt', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const priorityLabels = {
    1: { label: 'Highest', color: 'text-red-600 dark:text-red-400' },
    2: { label: 'High', color: 'text-orange-600 dark:text-orange-400' },
    3: { label: 'Medium', color: 'text-yellow-600 dark:text-yellow-400' },
    4: { label: 'Low', color: 'text-green-600 dark:text-green-400' },
    5: { label: 'Lowest', color: 'text-gray-600 dark:text-gray-400' },
  }

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

  return (
    <div className="fixed inset-0 md:inset-y-0 md:left-auto md:right-0 w-full md:max-w-lg bg-white dark:bg-slate-800 shadow-xl z-50 overflow-y-auto">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-60 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 ${
          toast.type === 'error'
            ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200'
            : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200'
        }`}>
          {toast.type === 'success' && <Check size={16} />}
          {toast.message}
        </div>
      )}

      <div className="p-4 md:p-6 pb-24 md:pb-6">
        {/* Header - sticky on mobile */}
        <div className="flex items-center justify-between mb-4 md:mb-6 sticky top-0 bg-white dark:bg-slate-800 -mx-4 md:mx-0 px-4 md:px-0 py-2 md:py-0 z-10 border-b md:border-b-0 border-slate-200 dark:border-slate-700">
          <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white">Job Details</h2>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 px-3 py-2 md:py-1.5 text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors min-h-[44px] md:min-h-0"
              >
                <Pencil size={14} />
                Edit
              </button>
            ) : null}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
              <X size={24} className="md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Title and Company */}
          <div>
            {isEditing ? (
              <>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  value={editData.title || ''}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="text-2xl font-bold w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white mb-2"
                />
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Company</label>
                <input
                  type="text"
                  value={editData.company || ''}
                  onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                  className="text-lg w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                />
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{job.title}</h3>
                <p className="text-lg text-slate-600 dark:text-slate-300">{job.company}</p>
              </>
            )}
          </div>

          {/* Quick Fields Row - Status, Priority, Applied */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={job.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="new">New</option>
                <option value="reviewing">Reviewing</option>
                <option value="applied">Applied</option>
                <option value="interviewing">Interviewing</option>
                <option value="offer">Offer</option>
                <option value="rejected">Rejected</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={job.priority || 3}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className={`w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 ${priorityLabels[job.priority || 3].color}`}
              >
                <option value={1}>1 - Highest</option>
                <option value={2}>2 - High</option>
                <option value={3}>3 - Medium</option>
                <option value={4}>4 - Low</option>
                <option value={5}>5 - Lowest</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Applied
              </label>
              <button
                onClick={() => handleAppliedChange(!job.applied)}
                className={`w-full flex items-center justify-center gap-1 px-2 py-1.5 text-sm rounded-lg border transition-colors ${
                  job.applied
                    ? 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                    : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                }`}
              >
                {job.applied ? <CheckSquare size={14} /> : <Square size={14} />}
                {job.applied ? 'Yes' : 'No'}
              </button>
            </div>
          </div>

          {/* Follow-up Date */}
          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <Bell size={16} />
              Follow-up Date
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="date"
                value={job.follow_up_date || ''}
                onChange={(e) => onUpdate(job.id, { follow_up_date: e.target.value || null })}
                className={`flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
                  isFollowUpDue(job.follow_up_date)
                    ? 'border-red-500 dark:border-red-400'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
              />
              {job.follow_up_date && (
                <button
                  onClick={() => onUpdate(job.id, { follow_up_date: null })}
                  className="px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onUpdate(job.id, { follow_up_date: addDaysToToday(3) })}
                className="flex-1 px-2 py-1.5 text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
              >
                In 3 days
              </button>
              <button
                onClick={() => onUpdate(job.id, { follow_up_date: addDaysToToday(7) })}
                className="flex-1 px-2 py-1.5 text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
              >
                In 1 week
              </button>
              <button
                onClick={() => onUpdate(job.id, { follow_up_date: addDaysToToday(14) })}
                className="flex-1 px-2 py-1.5 text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
              >
                In 2 weeks
              </button>
            </div>
            {job.follow_up_date && isFollowUpDue(job.follow_up_date) && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 font-medium">
                Follow-up due!
              </p>
            )}
          </div>

          {/* URL */}
          {isEditing ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Job URL
              </label>
              <input
                type="url"
                value={editData.url || ''}
                onChange={(e) => setEditData({ ...editData, url: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="https://..."
              />
            </div>
          ) : job.url ? (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ExternalLink size={16} />
              View Original Posting
            </a>
          ) : null}

          {/* Location and Remote Type */}
          {isEditing ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={editData.location || ''}
                  onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder="City, State"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Remote Type
                </label>
                <select
                  value={editData.remote_type || 'unknown'}
                  onChange={(e) => setEditData({ ...editData, remote_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="unknown">Unknown</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">Onsite</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Location
                </label>
                <p className="text-slate-900 dark:text-white">{job.location || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Remote Type
                </label>
                <p className="text-slate-900 dark:text-white capitalize">{job.remote_type || 'Unknown'}</p>
              </div>
            </div>
          )}

          {/* Salary */}
          {isEditing ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Salary Min
                </label>
                <input
                  type="number"
                  value={editData.salary_min || ''}
                  onChange={(e) => setEditData({ ...editData, salary_min: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder="120000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Salary Max
                </label>
                <input
                  type="number"
                  value={editData.salary_max || ''}
                  onChange={(e) => setEditData({ ...editData, salary_max: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder="160000"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Salary Range
              </label>
              <p className="text-slate-900 dark:text-white">
                {job.salary_min || job.salary_max
                  ? `$${job.salary_min?.toLocaleString() || '?'} - $${job.salary_max?.toLocaleString() || '?'}`
                  : 'Not specified'}
              </p>
            </div>
          )}

          {/* Resume Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Resume
            </label>
            <div className="flex items-center gap-2">
              <select
                value={job.resume_id || ''}
                onChange={(e) => handleResumeChange(e.target.value ? parseInt(e.target.value) : null)}
                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              >
                <option value="">None selected</option>
                {resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.original_filename} {resume.is_primary ? '(Primary)' : ''}
                  </option>
                ))}
              </select>
              {job.resume && (
                <a
                  href={`${apiBase.replace('/api/v1', '')}/api/resumes/${job.resume.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg"
                  title="Download resume"
                >
                  <FileText size={16} />
                </a>
              )}
            </div>
            {job.resume && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Using: {job.resume.original_filename}
              </p>
            )}
          </div>

          {/* AI Prompt Buttons - Only show in view mode */}
          {!isEditing && (
            <div className="flex flex-col gap-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                AI Assistance
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateCoverLetter}
                  disabled={isGenerating}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg text-sm transition-colors"
                >
                  <FileText size={16} />
                  {isGenerating ? 'Generating...' : 'Cover Letter Prompt'}
                </button>
                <button
                  onClick={handleTailorResume}
                  disabled={isGenerating}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm transition-colors"
                >
                  <Wand2 size={16} />
                  {isGenerating ? 'Generating...' : 'Tailor Resume Prompt'}
                </button>
              </div>
              <button
                onClick={handleMatchAnalysis}
                disabled={isGenerating}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-lg text-sm transition-colors"
              >
                <Target size={16} />
                {isGenerating ? 'Generating...' : 'Analyze Resume Match'}
              </button>
            </div>
          )}

          {/* Match Analysis */}
          {job.match_score != null && (
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Match Analysis
                </label>
                <span className={`text-lg font-bold ${getScoreTextClasses(job.match_score)}`}>
                  {job.match_score}/100
                </span>
              </div>
              {(() => {
                try {
                  const fits = job.why_good_fit ? JSON.parse(job.why_good_fit) : [];
                  const gaps = job.missing_gaps ? JSON.parse(job.missing_gaps) : [];
                  return (
                    <div className="space-y-2">
                      {fits.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Why it's a good fit:</p>
                          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                            {fits.map((f, i) => <li key={i} className="flex items-start gap-1"><span className="text-green-500 mt-0.5">+</span> {f}</li>)}
                          </ul>
                        </div>
                      )}
                      {gaps.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-1">Potential gaps:</p>
                          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                            {gaps.map((g, i) => <li key={i} className="flex items-start gap-1"><span className="text-orange-500 mt-0.5">-</span> {g}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                } catch { return null; }
              })()}
            </div>
          )}

          {/* Why This Company */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Why This Company
            </label>
            {isEditing ? (
              <textarea
                value={editData.why_this_company || ''}
                onChange={(e) => setEditData({ ...editData, why_this_company: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-y"
                placeholder="What excites you about this opportunity?"
              />
            ) : (
              <textarea
                value={editData.why_this_company || ''}
                onChange={(e) => setEditData({ ...editData, why_this_company: e.target.value })}
                onBlur={() => onUpdate(job.id, { why_this_company: editData.why_this_company })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="What excites you about this opportunity?"
              />
            )}
          </div>

          {/* Company Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Company Notes
            </label>
            {isEditing ? (
              <textarea
                value={editData.company_notes || ''}
                onChange={(e) => setEditData({ ...editData, company_notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-y"
                placeholder="Research about the company..."
              />
            ) : (
              <textarea
                value={editData.company_notes || ''}
                onChange={(e) => setEditData({ ...editData, company_notes: e.target.value })}
                onBlur={() => onUpdate(job.id, { company_notes: editData.company_notes })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="Research about the company..."
              />
            )}
          </div>

          {/* General Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              General Notes
            </label>
            {isEditing ? (
              <textarea
                value={editData.general_notes || ''}
                onChange={(e) => setEditData({ ...editData, general_notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-y"
                placeholder="Interview notes, contacts, follow-ups..."
              />
            ) : (
              <textarea
                value={editData.general_notes || ''}
                onChange={(e) => setEditData({ ...editData, general_notes: e.target.value })}
                onBlur={() => onUpdate(job.id, { general_notes: editData.general_notes })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="Interview notes, contacts, follow-ups..."
              />
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Job Description
            </label>
            {isEditing ? (
              <textarea
                value={editData.description || ''}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-y min-h-[200px]"
                placeholder="Paste the job description here..."
              />
            ) : job.description ? (
              <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg max-h-64 overflow-y-auto whitespace-pre-wrap">
                {job.description}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No description</p>
            )}
          </div>

          {/* Edit Mode Buttons */}
          {isEditing && (
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}

          {/* Delete Button - Only show in view mode */}
          {!isEditing && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 mt-4"
            >
              <Trash2 size={16} />
              Delete Job
            </button>
          )}
        </div>
      </div>

      {/* Prompt Modal */}
      <PromptModal
        isOpen={promptModal.isOpen}
        onClose={() => setPromptModal({ ...promptModal, isOpen: false })}
        title={promptModal.title}
        prompt={promptModal.prompt}
        jobTitle={promptModal.jobTitle}
        company={promptModal.company}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete(job.id)
          onClose()
        }}
        title="Delete job?"
        message={`Are you sure you want to delete "${job.title}" at ${job.company}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}
