import { useState, useEffect, useRef } from 'react'
import { FileText, Upload, Trash2, Star, ChevronDown, ChevronUp, X } from 'lucide-react'
import { resumesApi } from '../services/api'
import { ConfirmModal } from './ui'

function ResumeManager() {
  const [resumes, setResumes] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedResume, setSelectedResume] = useState(null)
  const [resumeText, setResumeText] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchResumes()
  }, [])

  const fetchResumes = async () => {
    try {
      const response = await resumesApi.getAll()
      setResumes(response.data)
      setError(null)
    } catch (err) {
      setError('Failed to fetch resumes')
      console.error('Error fetching resumes:', err)
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are allowed')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const response = await resumesApi.upload(file)
      setResumes([response.data, ...resumes])
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload resume')
      console.error('Error uploading resume:', err)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSetPrimary = async (id) => {
    try {
      await resumesApi.setPrimary(id)
      setResumes(resumes.map((r) => ({ ...r, is_primary: r.id === id })))
    } catch (err) {
      setError('Failed to set primary resume')
      console.error('Error setting primary resume:', err)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return

    setIsDeleting(true)
    try {
      await resumesApi.delete(deleteConfirm.id)
      setResumes(resumes.filter((r) => r.id !== deleteConfirm.id))
      if (selectedResume?.id === deleteConfirm.id) {
        setSelectedResume(null)
        setResumeText('')
      }
    } catch (err) {
      setError('Failed to delete resume')
      console.error('Error deleting resume:', err)
    } finally {
      setIsDeleting(false)
      setDeleteConfirm(null)
    }
  }

  const handleViewText = async (resume) => {
    if (selectedResume?.id === resume.id) {
      setSelectedResume(null)
      setResumeText('')
      return
    }

    try {
      const response = await resumesApi.getText(resume.id)
      setSelectedResume(resume)
      setResumeText(response.data.text)
    } catch (err) {
      setError('Failed to fetch resume text')
      console.error('Error fetching resume text:', err)
    }
  }

  const primaryResume = resumes.find((r) => r.is_primary)

  // Helper to truncate filename
  const truncateFilename = (filename, maxLen = 20) => {
    if (!filename || filename.length <= maxLen) return filename
    const ext = filename.lastIndexOf('.') > 0 ? filename.slice(filename.lastIndexOf('.')) : ''
    const nameWithoutExt = filename.slice(0, filename.lastIndexOf('.') > 0 ? filename.lastIndexOf('.') : filename.length)
    const truncatedName = nameWithoutExt.slice(0, maxLen - ext.length - 3) + '...'
    return truncatedName + ext
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="text-blue-600 flex-shrink-0" size={20} />
          <span className="font-medium text-slate-900 dark:text-white flex-shrink-0">Resume</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            ({resumes.length})
          </span>
        </div>
        {isExpanded ? <ChevronUp size={20} className="flex-shrink-0" /> : <ChevronDown size={20} className="flex-shrink-0" />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-700">
          {error && (
            <div className="mt-3 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 text-sm rounded">
              {error}
            </div>
          )}

          <div className="mt-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50"
            >
              <Upload size={16} />
              {isUploading ? 'Uploading...' : 'Upload PDF'}
            </button>
          </div>

          {resumes.length > 0 && (
            <div className="mt-4 space-y-2">
              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className={`flex items-center p-3 rounded-lg border transition-colors ${
                    resume.is_primary
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <FileText size={16} className="text-slate-400 flex-shrink-0" />
                  <div className="ml-3 min-w-0 flex-1">
                    <p
                      className="text-sm font-medium text-slate-900 dark:text-white truncate"
                      title={resume.original_filename}
                    >
                      {truncateFilename(resume.original_filename, 80)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(resume.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {resume.is_primary && (
                    <span className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded flex-shrink-0 ml-2">
                      <Star size={10} fill="currentColor" />
                      Primary
                    </span>
                  )}
                  <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
                    <button
                      onClick={() => handleViewText(resume)}
                      className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 ${
                        selectedResume?.id === resume.id
                          ? 'text-blue-600'
                          : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                      title="View extracted text"
                    >
                      <FileText size={14} />
                    </button>
                    {!resume.is_primary && (
                      <button
                        onClick={() => handleSetPrimary(resume.id)}
                        className="p-1.5 text-slate-400 hover:text-yellow-500 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
                        title="Set as primary"
                      >
                        <Star size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteConfirm(resume)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedResume && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Extracted Text: {selectedResume.original_filename}
                </h4>
                <button
                  onClick={() => {
                    setSelectedResume(null)
                    setResumeText('')
                  }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg max-h-64 overflow-y-auto">
                <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
                  {resumeText || 'No text extracted'}
                </pre>
              </div>
            </div>
          )}

          {resumes.length === 0 && !isUploading && (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              No resumes uploaded yet. Upload a PDF to get started.
            </p>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete resume?"
        message={`Are you sure you want to delete "${deleteConfirm?.original_filename}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}

export default ResumeManager
