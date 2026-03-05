import { Component } from 'react'

/**
 * Error boundary component that catches React render errors
 * and displays a friendly error page instead of crashing.
 * Integrates with Sentry for error monitoring when configured.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null, eventId: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })

    // Send to Sentry if configured (loaded dynamically in main.jsx)
    if (window.__SENTRY__) {
      try {
        const eventId = window.__SENTRY__.captureException(error, {
          extra: {
            componentStack: errorInfo?.componentStack,
          },
        })
        this.setState({ eventId })
      } catch (e) {
        console.warn('Failed to report error to Sentry:', e)
      }
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoBack = () => {
    window.location.href = '/board'
  }

  handleReportIssue = () => {
    // Open Sentry user feedback dialog if available
    if (window.__SENTRY__ && this.state.eventId) {
      try {
        window.__SENTRY__.showReportDialog({ eventId: this.state.eventId })
      } catch (e) {
        window.open('https://github.com/wjamhoury/huntboard/issues', '_blank')
      }
    } else {
      // Fallback to GitHub issues
      window.open('https://github.com/wjamhoury/huntboard/issues', '_blank')
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-600 dark:text-red-400"
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
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We're sorry, but something unexpected happened. Please try reloading the page.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleGoBack}
                className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors font-medium"
              >
                Go to Board
              </button>
              <button
                onClick={this.handleReportIssue}
                className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors font-medium"
              >
                Report Issue
              </button>
            </div>

            {/* Show technical details in development */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-8 text-left bg-gray-100 dark:bg-slate-800 rounded-lg p-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Technical Details
                </summary>
                <pre className="text-xs text-red-600 dark:text-red-400 overflow-auto max-h-48">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
