import { useSearchParams, useLocation } from 'react-router-dom'
import { useCallback, useMemo } from 'react'

/**
 * Filter configuration with defaults and URL param mapping
 */
const FILTER_DEFAULTS = {
  keyword: '',
  location: '',
  minScore: null,
  maxScore: null,
  source: '',
  status: '',
  remoteOnly: false,
  sort: 'date_desc',
}

/**
 * Hook for managing job filters via URL search params
 * Provides filter state that persists across page refreshes
 */
export function useJobFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()

  /**
   * Read current filters from URL params
   */
  const filters = useMemo(() => {
    return {
      keyword: searchParams.get('keyword') || FILTER_DEFAULTS.keyword,
      location: searchParams.get('location') || FILTER_DEFAULTS.location,
      minScore: searchParams.get('min_score') ? parseInt(searchParams.get('min_score'), 10) : FILTER_DEFAULTS.minScore,
      maxScore: searchParams.get('max_score') ? parseInt(searchParams.get('max_score'), 10) : FILTER_DEFAULTS.maxScore,
      source: searchParams.get('source') || FILTER_DEFAULTS.source,
      status: searchParams.get('status') || FILTER_DEFAULTS.status,
      remoteOnly: searchParams.get('remote_only') === 'true',
      sort: searchParams.get('sort') || FILTER_DEFAULTS.sort,
    }
  }, [searchParams])

  /**
   * Check if any filters are active (not default values)
   */
  const hasActiveFilters = useMemo(() => {
    return (
      filters.keyword !== FILTER_DEFAULTS.keyword ||
      filters.location !== FILTER_DEFAULTS.location ||
      filters.minScore !== FILTER_DEFAULTS.minScore ||
      filters.maxScore !== FILTER_DEFAULTS.maxScore ||
      filters.source !== FILTER_DEFAULTS.source ||
      filters.status !== FILTER_DEFAULTS.status ||
      filters.remoteOnly !== FILTER_DEFAULTS.remoteOnly ||
      filters.sort !== FILTER_DEFAULTS.sort
    )
  }, [filters])

  /**
   * Set a single filter value
   * Clears the param if value is empty/null/default
   */
  const setFilter = useCallback((key, value) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev)

      // Map JS key names to URL param names
      const paramKey = {
        keyword: 'keyword',
        location: 'location',
        minScore: 'min_score',
        maxScore: 'max_score',
        source: 'source',
        status: 'status',
        remoteOnly: 'remote_only',
        sort: 'sort',
      }[key] || key

      // Clear param if value is empty/null/default
      const defaultValue = FILTER_DEFAULTS[key]
      if (value === '' || value === null || value === undefined || value === defaultValue) {
        newParams.delete(paramKey)
      } else if (typeof value === 'boolean') {
        if (value) {
          newParams.set(paramKey, 'true')
        } else {
          newParams.delete(paramKey)
        }
      } else {
        newParams.set(paramKey, String(value))
      }

      return newParams
    }, { replace: true })
  }, [setSearchParams])

  /**
   * Set multiple filters at once
   */
  const setFilters = useCallback((newFilters) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev)

      Object.entries(newFilters).forEach(([key, value]) => {
        const paramKey = {
          keyword: 'keyword',
          location: 'location',
          minScore: 'min_score',
          maxScore: 'max_score',
          source: 'source',
          status: 'status',
          remoteOnly: 'remote_only',
          sort: 'sort',
        }[key] || key

        const defaultValue = FILTER_DEFAULTS[key]
        if (value === '' || value === null || value === undefined || value === defaultValue) {
          newParams.delete(paramKey)
        } else if (typeof value === 'boolean') {
          if (value) {
            newParams.set(paramKey, 'true')
          } else {
            newParams.delete(paramKey)
          }
        } else {
          newParams.set(paramKey, String(value))
        }
      })

      return newParams
    }, { replace: true })
  }, [setSearchParams])

  /**
   * Clear all filters (reset to defaults)
   */
  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true })
  }, [setSearchParams])

  /**
   * Build API query params object from current filters
   * This can be passed directly to the jobsApi.getAll() function
   */
  const apiParams = useMemo(() => {
    const params = {}

    if (filters.keyword) params.keyword = filters.keyword
    if (filters.location) params.location = filters.location
    if (filters.minScore !== null) params.min_score = filters.minScore
    if (filters.maxScore !== null) params.max_score = filters.maxScore
    if (filters.source) params.source = filters.source
    if (filters.status) params.status = filters.status
    if (filters.remoteOnly) params.remote_only = true
    if (filters.sort && filters.sort !== 'date_desc') params.sort = filters.sort

    return params
  }, [filters])

  return {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    hasActiveFilters,
    apiParams,
  }
}

/**
 * Quick filter presets
 */
export const QUICK_FILTERS = {
  remote: { remoteOnly: true },
  highMatch: { minScore: 80 },
  appliedThisWeek: { status: 'applied' },
  all: {},
}

/**
 * Available source options for the filter dropdown
 */
export const SOURCE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'greenhouse', label: 'Greenhouse' },
  { value: 'workday', label: 'Workday' },
  { value: 'lever', label: 'Lever' },
  { value: 'rss', label: 'RSS' },
  { value: 'manual', label: 'Manual' },
  { value: 'import_url', label: 'URL Import' },
]

/**
 * Available sort options
 */
export const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'score_desc', label: 'Best Match' },
  { value: 'score_asc', label: 'Lowest Match' },
  { value: 'company_asc', label: 'Company A-Z' },
]

/**
 * Score preset options for quick filtering
 */
export const SCORE_PRESETS = [
  { value: null, label: 'All Scores' },
  { value: 80, label: 'Great Match (80+)' },
  { value: 60, label: 'Good (60+)' },
  { value: 40, label: 'Fair (40+)' },
]
