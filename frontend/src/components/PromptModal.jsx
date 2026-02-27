import { useState } from 'react'
import { X, Copy, Check, ExternalLink } from 'lucide-react'

function PromptModal({ isOpen, onClose, title, prompt, jobTitle, company, subtitle }) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleOpenClaude = () => {
    window.open('https://claude.ai/new', '_blank')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {jobTitle} at {company}
              {subtitle && <span className="ml-2 text-teal-600 dark:text-teal-400">• {subtitle}</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
            <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
              {prompt}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Copy this prompt and paste it into Claude.ai
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenClaude}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ExternalLink size={18} />
              Open Claude.ai
            </button>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check size={18} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Copy to Clipboard
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PromptModal
