import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute() {
  const { isAuthenticated, loading, profileLoading, onboardingComplete, userProfile } = useAuth()
  const location = useLocation()

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Check onboarding state (only if we have profile data)
  if (userProfile && !onboardingComplete) {
    // User needs to complete onboarding
    if (location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />
    }
  } else if (userProfile && onboardingComplete) {
    // User has completed onboarding, redirect away from onboarding page
    if (location.pathname === '/onboarding') {
      return <Navigate to="/board" replace />
    }
  }

  return <Outlet />
}
