// CRITICAL: Import amplifyConfig FIRST - before any other imports
// This ensures Amplify is configured before aws-amplify/auth initializes
import './amplifyConfig'

import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.jsx'
import './index.css'

// Initialize Sentry if DSN is configured
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance monitoring - sample 10% of transactions
    tracesSampleRate: 0.1,
    // Session replay - 10% of sessions, 100% of errors
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Don't send errors in dev mode unless explicitly configured
    enabled: import.meta.env.PROD || !!SENTRY_DSN,
    // Filter out common noise
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Network errors
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      // ResizeObserver
      'ResizeObserver loop',
    ],
    beforeSend(event) {
      // Don't send events if user has opted out
      if (localStorage.getItem('disable-error-tracking') === 'true') {
        return null
      }
      return event
    },
  })
  console.log('Sentry initialized for error monitoring')
}

// Initialize dark mode from localStorage or system preference
const savedTheme = localStorage.getItem('theme')
if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark')
}

// Global error handlers
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global error:', { message, source, lineno, colno, error })
  if (SENTRY_DSN && error) {
    Sentry.captureException(error)
  }
}

window.onunhandledrejection = (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  if (SENTRY_DSN && event.reason) {
    Sentry.captureException(event.reason)
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
