import { useState, useRef } from 'react'
import { FileText, Upload, Trash2, Star, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useResumes, useUploadResume, useSetPrimaryResume, useDeleteResume, useResumeText } from '../hooks/useResumes'
import { SkeletonResumeItem } from '../components/ui/Skeleton'
import { ConfirmModal } from '../components/ui'

export default function ResumesPage() {
  const [selectedResume, setSelectedResume] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const fileInputRef = useRef(null)

  const { data: resumes = [], isLoading } = useResumes()
  const uploadResume = useUploadResume()
  const setPrimaryResume = useSetPrimaryResume()
  const deleteResume = useDeleteResume()
  const { data: resumeTextData } = useResumeText(selectedResume?.id)

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are allowed')
      return
    }

    try {
      await uploadResume.mutateAsync(file)
      toast.success('Resume uploaded')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSetPrimary = async (id) => {
    try {
      await setPrimaryResume.mutateAsync(id)
      toast.success('Primary resume updated')
    } catch (err) {
      toast.error('Failed to set primary resume')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return

    try {
      await deleteResume.mutateAsync(deleteConfirm.id)
      if (selectedResume?.id === deleteConfirm.id) {
        setSelectedResume(null)
      }
      toast.success('Resume deleted')
    } catch (err) {
      toast.error('Failed to delete resume')
    } finally {
      setDeleteConfirm(null)
    }
  }

  const truncateFilename = (filename, maxLen = 40) => {
    if (!filename || filename.length <= maxLen) return filename
    const ext = filename.lastIndexOf('.') > 0 ? filename.slice(filename.lastIndexOf('.')) : ''
    const nameWithoutExt = filename.slice(0, filename.lastIndexOf('.') > 0 ? filename.lastIndexOf('.') : filename.length)
    const truncatedName = nameWithoutExt.slice(0, maxLen - ext.length - 3) + '...'
    return truncatedName + ext
  }

  return (
    <div className="p-4 pb-20 md:pb-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Resumes</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Upload and manage your resumes. Your primary resume will be used for job matching and AI assistance.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadResume.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
        >
          <Upload size={18} />
          {uploadResume.isPending ? 'Uploading...' : 'Upload PDF Resume'}
        </button>

        {isLoading ? (
          <div className="mt-6 space-y-3">
            <SkeletonResumeItem />
            <SkeletonResumeItem />
          </div>
        ) : resumes.length > 0 ? (
          <div className="mt-6 space-y-3">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className={`flex items-center p-4 rounded-lg border transition-colors ${
                  resume.is_primary
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <FileText size={20} className="text-slate-400 flex-shrink-0" />
                <div className="ml-4 flex-1 min-w-0">
                  <p
                    className="font-medium text-slate-900 dark:text-white truncate"
                    title={resume.original_filename}
                  >
                    {truncateFilename(resume.original_filename)}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Uploaded {new Date(resume.created_at).toLocaleDateString()}
                  </p>
                </div>

                {resume.is_primary && (
                  <span className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-2 py-1 rounded flex-shrink-0 mx-2">
                    <Star size={12} fill="currentColor" />
                    Primary
                  </span>
                )}

                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  <button
                    onClick={() => setSelectedResume(selectedResume?.id === resume.id ? null : resume)}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-600 ${
                      selectedResume?.id === resume.id
                        ? 'text-blue-600'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                    title="View extracted text"
                  >
                    <FileText size={16} />
                  </button>
                  {!resume.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(resume.id)}
                      className="p-2 text-slate-400 hover:text-yellow-500 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
                      title="Set as primary"
                    >
                      <Star size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteConfirm(resume)}
                    className="p-2 text-slate-400 hover:text-red-500 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 text-center py-12">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              No resumes uploaded
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Upload a PDF resume to get started with job matching and AI assistance.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadResume.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              <Upload size={18} />
              Upload Resume
            </button>
          </div>
        )}

        {selectedResume && resumeTextData && (
          <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-slate-900 dark:text-white">
                Extracted Text: {selectedResume.original_filename}
              </h3>
              <button
                onClick={() => setSelectedResume(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded"
              >
                <X size={16} />
              </button>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg max-h-96 overflow-y-auto">
              <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
                {resumeTextData.text || 'No text extracted'}
              </pre>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete resume?"
        message={`Are you sure you want to delete "${deleteConfirm?.original_filename}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteResume.isPending}
      />
    </div>
  )
}
