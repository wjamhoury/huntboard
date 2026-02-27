import { useEffect } from 'react'
import { X, Search, MapPin, Globe, Sparkles, Check } from 'lucide-react'
import { useJobFilters, SOURCE_OPTIONS, SORT_OPTIONS, SCORE_PRESETS, QUICK_FILTERS } from '../../hooks/useJobFilters'

export default function MobileFilterSheet({ isOpen, onClose }) {
  const { filters, setFilter, setFilters, clearFilters, hasActiveFilters } = useJobFilters()

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleQuickFilter = (preset) => {
    clearFilters()
    if (Object.keys(preset).length > 0) {
      setFilters(preset)
    }
  }

  const handleApply = () => {
    onClose()
  }

  const handleClear = () => {
    clearFilters()
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* Full-screen panel */}
      <div className="absolute inset-0 bg-white dark:bg-slate-900 animate-slide-up flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Filters</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Quick Filters */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Quick Filters
            </label>
            <div className="flex flex-wrap gap-2">
              <QuickFilterChip
                active={!hasActiveFilters}
                onClick={() => handleQuickFilter(QUICK_FILTERS.all)}
              >
                All Jobs
              </QuickFilterChip>
              <QuickFilterChip
                active={filters.remoteOnly && !filters.minScore}
                onClick={() => handleQuickFilter(QUICK_FILTERS.remote)}
                icon={<Globe size={14} />}
              >
                Remote Only
              </QuickFilterChip>
              <QuickFilterChip
                active={filters.minScore === 80 && !filters.remoteOnly}
                onClick={() => handleQuickFilter(QUICK_FILTERS.highMatch)}
                icon={<Sparkles size={14} />}
              >
                High Match (80+)
              </QuickFilterChip>
            </div>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Search Keywords
            </label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.keyword || ''}
                onChange={(e) => setFilter('keyword', e.target.value)}
                placeholder="Job title, company, skills..."
                className="w-full pl-10 pr-4 py-3 text-base bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Location
            </label>
            <div className="relative">
              <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.location || ''}
                onChange={(e) => setFilter('location', e.target.value)}
                placeholder="City, state, or 'remote'"
                className="w-full pl-10 pr-4 py-3 text-base bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Remote Toggle */}
          <div>
            <button
              onClick={() => setFilter('remoteOnly', !filters.remoteOnly)}
              className={`w-full flex items-center justify-between p-4 rounded-lg border transition-colors ${
                filters.remoteOnly
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <Globe size={20} className={filters.remoteOnly ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'} />
                <span className={`font-medium ${filters.remoteOnly ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                  Remote Only
                </span>
              </div>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                filters.remoteOnly ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700'
              }`}>
                {filters.remoteOnly && <Check size={14} />}
              </div>
            </button>
          </div>

          {/* Score */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Minimum Match Score
            </label>
            <select
              value={filters.minScore ?? ''}
              onChange={(e) => setFilter('minScore', e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-4 py-3 text-base bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SCORE_PRESETS.map((opt) => (
                <option key={opt.value ?? 'null'} value={opt.value ?? ''}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Job Source
            </label>
            <select
              value={filters.source || ''}
              onChange={(e) => setFilter('source', e.target.value || null)}
              className="w-full px-4 py-3 text-base bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value ?? 'null'} value={opt.value ?? ''}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Sort By
            </label>
            <select
              value={filters.sort || 'date_desc'}
              onChange={(e) => setFilter('sort', e.target.value)}
              className="w-full px-4 py-3 text-base bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 safe-area-pb">
          <button
            onClick={handleClear}
            disabled={!hasActiveFilters}
            className="flex-1 py-3 px-4 text-base font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg disabled:opacity-50"
          >
            Clear All
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 px-4 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  )
}

function QuickFilterChip({ children, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-colors ${
        active
          ? 'bg-blue-500 text-white'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}
