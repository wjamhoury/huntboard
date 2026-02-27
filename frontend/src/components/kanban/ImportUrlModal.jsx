import { useState } from 'react'
import { X, Link, Loader2 } from 'lucide-react'
import { jobsApi } from '../../services/api'

export default function ImportUrlModal({ isOpen, onClose, onImport }) {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await jobsApi.importFromUrl(url)
      onImport(response.data)
      setUrl('')
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to import job from URL')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Import Job from URL</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Paste a job posting URL and we'll automatically extract the job details.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Job URL
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="https://boards.greenhouse.io/company/jobs/123"
            />
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Link size={18} />
                  Import
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
