/**
 * Shared score color utility for consistent job match score display.
 *
 * Color scheme:
 * - 80-100: Green (great match)
 * - 60-79: Yellow/Amber (good match)
 * - 40-59: Orange (moderate match)
 * - 0-39: Red (weak match)
 *
 * This matches the email digest color scheme.
 */

/**
 * Get Tailwind CSS classes for a score badge background and text color
 * @param {number} score - The match score (0-100)
 * @returns {string} Tailwind CSS classes for background and text colors
 */
export function getScoreBadgeClasses(score) {
  if (score == null) return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'

  if (score >= 80) {
    return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
  }
  if (score >= 60) {
    return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
  }
  if (score >= 40) {
    return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
  }
  return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
}

/**
 * Get Tailwind CSS classes for score text color only
 * @param {number} score - The match score (0-100)
 * @returns {string} Tailwind CSS classes for text color
 */
export function getScoreTextClasses(score) {
  if (score == null) return 'text-slate-500 dark:text-slate-400'

  if (score >= 80) {
    return 'text-green-600 dark:text-green-400'
  }
  if (score >= 60) {
    return 'text-yellow-600 dark:text-yellow-400'
  }
  if (score >= 40) {
    return 'text-orange-600 dark:text-orange-400'
  }
  return 'text-red-600 dark:text-red-400'
}

/**
 * Get SVG stroke color class for circular progress indicators
 * @param {number} score - The match score (0-100)
 * @returns {string} Tailwind CSS stroke class
 */
export function getScoreStrokeClass(score) {
  if (score == null) return 'stroke-slate-300'

  if (score >= 80) {
    return 'stroke-green-500'
  }
  if (score >= 60) {
    return 'stroke-yellow-500'
  }
  if (score >= 40) {
    return 'stroke-orange-500'
  }
  return 'stroke-red-500'
}

/**
 * Get hex color for charts and visualizations
 * @param {number} score - The match score (0-100)
 * @returns {string} Hex color code
 */
export function getScoreHexColor(score) {
  if (score == null) return '#94a3b8' // slate-400

  if (score >= 80) {
    return '#22c55e' // green-500
  }
  if (score >= 60) {
    return '#eab308' // yellow-500
  }
  if (score >= 40) {
    return '#f97316' // orange-500
  }
  return '#ef4444' // red-500
}

/**
 * Score range colors for histogram/distribution charts
 * Maps score ranges to their display colors
 */
export const SCORE_RANGE_COLORS = {
  '0-20': '#ef4444',    // red-500
  '20-40': '#f97316',   // orange-500
  '40-60': '#eab308',   // yellow-500
  '60-80': '#22c55e',   // green-500
  '80-100': '#10b981',  // emerald-500 (brightest green for top scores)
  'Unscored': '#94a3b8' // slate-400
}
