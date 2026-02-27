import { useEffect, useRef } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'info'
  isLoading = false,
}) {
  const confirmButtonRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      confirmButtonRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const variantStyles = {
    danger: {
      icon: <Trash2 size={24} />,
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      button: 'bg-red-600 hover:bg-red-700 disabled:bg-red-400',
    },
    warning: {
      icon: <AlertTriangle size={24} />,
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      button: 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400',
    },
    info: {
      icon: <AlertTriangle size={24} />,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400',
    },
  }

  const styles = variantStyles[variant] || variantStyles.danger

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      {/* Slide-up sheet on mobile, centered modal on desktop */}
      <div className="relative bg-white dark:bg-slate-800 w-full md:max-w-md md:mx-4 rounded-t-2xl md:rounded-lg shadow-xl p-6 animate-slide-up md:animate-none safe-area-pb">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <X size={20} />
        </button>

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${styles.iconBg} ${styles.iconColor}`}>
            {styles.icon}
          </div>
          <div className="flex-1 pt-1 pr-8">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse md:flex-row md:justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-full md:w-auto px-4 py-3 md:py-2 text-base md:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full md:w-auto px-4 py-3 md:py-2 text-base md:text-sm font-medium text-white rounded-lg transition-colors ${styles.button}`}
          >
            {isLoading ? 'Please wait...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
