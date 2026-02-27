import toast from 'react-hot-toast'

/**
 * User-friendly error messages based on HTTP status codes
 */
const ERROR_MESSAGES = {
  401: 'Session expired. Please log in again.',
  403: "You don't have permission to do that.",
  404: 'That item was not found.',
  409: 'This action conflicts with the current state. Please refresh and try again.',
  429: 'Too many requests. Please wait a moment.',
  500: 'Something went wrong on our end. Please try again.',
  502: 'Server is temporarily unavailable. Please try again.',
  503: 'Service is temporarily unavailable. Please try again.',
}

/**
 * Specific error messages for different operations
 */
const OPERATION_MESSAGES = {
  'resume-upload': 'Failed to upload resume. Please try again.',
  'resume-parse': 'Could not extract text from this PDF. Please try a different file.',
  'feed-sync': 'Could not sync feeds. They will be retried on the next sync.',
  'ai-scoring': 'AI scoring is temporarily unavailable. Jobs will be scored on the next sync.',
  'job-import': 'Failed to import job. Please check the URL and try again.',
}

/**
 * Get a user-friendly error message based on the error
 * @param {Error} error - The error object (usually from axios)
 * @param {string} operation - Optional operation type for more specific messages
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(error, operation = null) {
  // Check for operation-specific messages first
  if (operation && OPERATION_MESSAGES[operation]) {
    // Check if the error response contains a specific detail
    const detail = error?.response?.data?.detail
    if (detail && typeof detail === 'string') {
      return detail
    }
    return OPERATION_MESSAGES[operation]
  }

  // Network error (no response from server)
  if (!error?.response) {
    if (error?.message === 'Network Error') {
      return 'Could not connect to the server. Check your internet connection.'
    }
    return 'A network error occurred. Please check your connection and try again.'
  }

  const status = error.response.status
  const detail = error.response.data?.detail

  // Use server-provided detail if it's user-friendly
  if (detail && typeof detail === 'string' && !detail.includes('Error') && !detail.includes('Exception')) {
    return detail
  }

  // Fall back to status-based messages
  return ERROR_MESSAGES[status] || 'An unexpected error occurred. Please try again.'
}

/**
 * Handle API error and show toast notification
 * @param {Error} error - The error object
 * @param {string} operation - Optional operation type for more specific messages
 * @param {Function} onUnauthorized - Optional callback for 401 errors
 */
export function handleApiError(error, operation = null, onUnauthorized = null) {
  const message = getErrorMessage(error, operation)

  // Handle 401 specifically - redirect to login
  if (error?.response?.status === 401) {
    toast.error(message)
    if (onUnauthorized) {
      onUnauthorized()
    } else {
      // Default behavior: redirect to login
      setTimeout(() => {
        window.location.href = '/login'
      }, 1000)
    }
    return
  }

  toast.error(message)
}

/**
 * Create an onError handler for React Query mutations
 * @param {string} operation - Operation type for specific messages
 * @returns {Function} Error handler function
 */
export function createMutationErrorHandler(operation = null) {
  return (error) => {
    handleApiError(error, operation)
  }
}

export default {
  getErrorMessage,
  handleApiError,
  createMutationErrorHandler,
}
