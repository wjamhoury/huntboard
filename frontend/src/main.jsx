// CRITICAL: Import amplifyConfig FIRST - before any other imports
// This ensures Amplify is configured before aws-amplify/auth initializes
import './amplifyConfig'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Initialize Sentry if DSN is configured (non-blocking dynamic import)
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
if (SENTRY_DSN) {
  import('@sentry/react').then((Sentry) => {
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
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      ignoreErrors: [
        'top.GLOBALS',
        'Network request failed',
        'Failed to fetch',
        'Load failed',
        'ResizeObserver loop',
      ],
      beforeSend(event) {
        if (localStorage.getItem('disable-error-tracking') === 'true') {
          return null
        }
        return event
      },
    })
    window.__SENTRY__ = Sentry
    console.log('Sentry initialized for error monitoring')
  }).catch((err) => {
    console.warn('Failed to load Sentry:', err)
  })
}

// Initialize dark mode from localStorage or system preference
const savedTheme = localStorage.getItem('theme')
if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark')
}

// Global error handlers
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global error:', { message, source, lineno, colno, error })
  if (window.__SENTRY__ && error) {
    window.__SENTRY__.captureException(error)
  }
}

window.onunhandledrejection = (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  if (window.__SENTRY__ && event.reason) {
    window.__SENTRY__.captureException(event.reason)
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
