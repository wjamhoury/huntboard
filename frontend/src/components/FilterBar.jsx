import { useState, useEffect, useRef } from 'react'
import { Search, MapPin, X, Filter, ChevronDown, Sparkles, Globe } from 'lucide-react'
import { useJobFilters, SOURCE_OPTIONS, SORT_OPTIONS, SCORE_PRESETS, QUICK_FILTERS } from '../hooks/useJobFilters'
import MobileFilterSheet from './mobile/MobileFilterSheet'

/**
 * Debounced input hook
 */
function useDebouncedCallback(callback, delay) {
  const timeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (value) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      callback(value)
    }, delay)
  }
}

/**
 * Main FilterBar component
 * Horizontal bar with search, location, score, source filters
 */
export default function FilterBar({ showQuickFilters = true, compact = false }) {
  const { filters, setFilter, setFilters, clearFilters, hasActiveFilters } = useJobFilters()
  const [isExpanded, setIsExpanded] = useState(false)
  const [localKeyword, setLocalKeyword] = useState(filters.keyword)
  const [localLocation, setLocalLocation] = useState(filters.location)

  // Sync local state with URL params
  useEffect(() => {
    setLocalKeyword(filters.keyword)
    setLocalLocation(filters.location)
  }, [filters.keyword, filters.location])

  // Debounced handlers
  const debouncedSetKeyword = useDebouncedCallback((value) => {
    setFilter('keyword', value)
  }, 300)

  const debouncedSetLocation = useDebouncedCallback((value) => {
    setFilter('location', value)
  }, 300)

  const handleKeywordChange = (e) => {
    const value = e.target.value
    setLocalKeyword(value)
    debouncedSetKeyword(value)
  }

  const handleLocationChange = (e) => {
    const value = e.target.value
    setLocalLocation(value)
    debouncedSetLocation(value)
  }

  const handleQuickFilter = (preset) => {
    clearFilters()
    if (Object.keys(preset).length > 0) {
      setFilters(preset)
    }
  }

  const activeQuickFilter = () => {
    if (!hasActiveFilters) return 'all'
    if (filters.remoteOnly && !filters.minScore && !filters.status) return 'remote'
    if (filters.minScore === 80 && !filters.remoteOnly && !filters.status) return 'highMatch'
    if (filters.status === 'applied' && !filters.remoteOnly && !filters.minScore) return 'appliedThisWeek'
    return null
  }

  // Count active filters for badge
  const activeFilterCount = [
    filters.keyword,
    filters.location,
    filters.minScore,
    filters.source,
    filters.status,
    filters.remoteOnly,
    filters.sort !== 'date_desc' ? filters.sort : null,
  ].filter(Boolean).length

  // Mobile: use full-screen filter sheet
  if (compact) {
    return (
      <div className="mb-4">
        {/* Mobile: Full-screen filter sheet */}
        <div className="md:hidden">
          <button
            onClick={() => setIsExpanded(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors min-h-[44px] ${
              hasActiveFilters
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Filter size={18} />
            <span className="font-medium">Filters</span>
            {hasActiveFilters && (
              <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Active filter chips shown below button */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.keyword && (
                <FilterChip label={`"${filters.keyword}"`} onRemove={() => setFilter('keyword', '')} />
              )}
              {filters.location && (
                <FilterChip label={filters.location} onRemove={() => setFilter('location', '')} />
              )}
              {filters.remoteOnly && (
                <FilterChip label="Remote" onRemove={() => setFilter('remoteOnly', false)} />
              )}
              {filters.minScore && (
                <FilterChip label={`${filters.minScore}+ score`} onRemove={() => setFilter('minScore', null)} />
              )}
              {filters.source && (
                <FilterChip label={filters.source} onRemove={() => setFilter('source', null)} />
              )}
              <button
                onClick={clearFilters}
                className="text-xs text-red-600 dark:text-red-400 px-2 py-1"
              >
                Clear all
              </button>
            </div>
          )}

          <MobileFilterSheet isOpen={isExpanded} onClose={() => setIsExpanded(false)} />
        </div>

        {/* Desktop: Collapsible panel (unchanged) */}
        <div className="hidden md:block">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              hasActiveFilters
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Filter size={18} />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                Active
              </span>
            )}
            <ChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>

          {isExpanded && (
            <div className="mt-3 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
              <FilterInputs
                localKeyword={localKeyword}
                localLocation={localLocation}
                filters={filters}
                onKeywordChange={handleKeywordChange}
                onLocationChange={handleLocationChange}
                setFilter={setFilter}
                stacked
              />
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-3 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4 space-y-3">
      {/* Quick Filters Row */}
      {showQuickFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Quick:</span>
          <QuickFilterPill
            active={activeQuickFilter() === 'all'}
            onClick={() => handleQuickFilter(QUICK_FILTERS.all)}
          >
            All
          </QuickFilterPill>
          <QuickFilterPill
            active={activeQuickFilter() === 'remote'}
            onClick={() => handleQuickFilter(QUICK_FILTERS.remote)}
            icon={<Globe size={14} />}
          >
            Remote
          </QuickFilterPill>
          <QuickFilterPill
            active={activeQuickFilter() === 'highMatch'}
            onClick={() => handleQuickFilter(QUICK_FILTERS.highMatch)}
            icon={<Sparkles size={14} />}
          >
            High Match (80+)
          </QuickFilterPill>
        </div>
      )}

      {/* Main Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterInputs
          localKeyword={localKeyword}
          localLocation={localLocation}
          filters={filters}
          onKeywordChange={handleKeywordChange}
          onLocationChange={handleLocationChange}
          setFilter={setFilter}
        />

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <X size={16} />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Filter input fields (shared between desktop and mobile layouts)
 */
function FilterInputs({
  localKeyword,
  localLocation,
  filters,
  onKeywordChange,
  onLocationChange,
  setFilter,
  stacked = false,
}) {
  const containerClass = stacked ? 'space-y-3' : 'flex flex-wrap items-center gap-2'

  return (
    <div className={containerClass}>
      {/* Keyword Search */}
      <div className={`relative ${stacked ? 'w-full' : 'w-48'}`}>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={localKeyword}
          onChange={onKeywordChange}
          placeholder="Search jobs..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Location Filter */}
      <div className={`relative ${stacked ? 'w-full' : 'w-40'}`}>
        <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={localLocation}
          onChange={onLocationChange}
          placeholder="Location..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Remote Toggle */}
      <button
        onClick={() => setFilter('remoteOnly', !filters.remoteOnly)}
        className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${
          filters.remoteOnly
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
            : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
        }`}
      >
        <Globe size={14} />
        Remote
      </button>

      {/* Score Dropdown */}
      <SelectDropdown
        value={filters.minScore}
        onChange={(value) => setFilter('minScore', value)}
        options={SCORE_PRESETS}
        placeholder="Score"
        icon={<Sparkles size={14} />}
        stacked={stacked}
      />

      {/* Source Dropdown */}
      <SelectDropdown
        value={filters.source}
        onChange={(value) => setFilter('source', value)}
        options={SOURCE_OPTIONS}
        placeholder="Source"
        stacked={stacked}
      />

      {/* Sort Dropdown */}
      <SelectDropdown
        value={filters.sort}
        onChange={(value) => setFilter('sort', value)}
        options={SORT_OPTIONS}
        placeholder="Sort"
        stacked={stacked}
      />
    </div>
  )
}

/**
 * Quick filter pill button
 */
function QuickFilterPill({ children, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
        active
          ? 'bg-blue-500 text-white'
          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

/**
 * Select dropdown component
 */
function SelectDropdown({ value, onChange, options, placeholder, icon, stacked }) {
  const displayValue = options.find((opt) => opt.value === value)?.label || placeholder

  return (
    <div className={`relative ${stacked ? 'w-full' : ''}`}>
      <select
        value={value ?? ''}
        onChange={(e) => {
          const val = e.target.value
          // Handle numeric values
          if (options[0]?.value === null && val === '') {
            onChange(null)
          } else if (!isNaN(parseInt(val, 10)) && typeof options[1]?.value === 'number') {
            onChange(parseInt(val, 10))
          } else {
            onChange(val || null)
          }
        }}
        className={`appearance-none ${stacked ? 'w-full' : 'w-auto min-w-[110px]'} pl-3 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer`}
      >
        {options.map((opt) => (
          <option key={opt.value ?? 'null'} value={opt.value ?? ''}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
    </div>
  )
}

/**
 * Compact filter badge showing active filter count
 * Use this in headers when FilterBar is hidden
 */
export function FilterBadge({ onClick }) {
  const { hasActiveFilters, filters } = useJobFilters()

  if (!hasActiveFilters) return null

  const activeCount = [
    filters.keyword,
    filters.location,
    filters.minScore,
    filters.source,
    filters.status,
    filters.remoteOnly,
    filters.sort !== 'date_desc' ? filters.sort : null,
  ].filter(Boolean).length

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
    >
      <Filter size={12} />
      {activeCount} filter{activeCount !== 1 ? 's' : ''}
    </button>
  )
}

/**
 * Small removable filter chip for mobile
 */
function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-blue-900 dark:hover:text-blue-100">
        <X size={12} />
      </button>
    </span>
  )
}
