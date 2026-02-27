import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { healthApi } from '../services/api'

const HEALTH_CHECK_INTERVAL = 30000 // 30 seconds

/**
 * Connection status banner that shows when the health check fails.
 * Auto-retries every 30 seconds and clears when connection is restored.
 */
function ConnectionStatus() {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  const { isError, refetch } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await healthApi.check()
      return response.data
    },
    retry: 1,
    refetchInterval: HEALTH_CHECK_INTERVAL,
    refetchOnWindowFocus: true,
  })

  // Show banner when there's an error
  useEffect(() => {
    if (isError && !isDismissed) {
      setIsVisible(true)
    } else if (!isError) {
      setIsVisible(false)
      setIsDismissed(false) // Reset dismissed state when connection is restored
    }
  }, [isError, isDismissed])

  const handleDismiss = useCallback(() => {
    setIsDismissed(true)
    setIsVisible(false)
  }, [])

  const handleRetry = useCallback(() => {
    refetch()
  }, [refetch])

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 dark:bg-amber-600 text-white px-4 py-2 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="text-sm font-medium">
            Connection issue — some features may be unavailable
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRetry}
            className="text-sm underline hover:no-underline focus:outline-none"
          >
            Retry
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-amber-600 dark:hover:bg-amber-700 rounded focus:outline-none"
            aria-label="Dismiss"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConnectionStatus
