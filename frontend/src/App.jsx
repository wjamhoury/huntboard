import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import LoginPage from './auth/LoginPage'
import SignupPage from './auth/SignupPage'
import ForgotPasswordPage from './auth/ForgotPasswordPage'
import ChangePasswordPage from './auth/ChangePasswordPage'
import ProtectedRoute from './auth/ProtectedRoute'
import AppLayout from './layouts/AppLayout'
import ErrorBoundary from './components/ErrorBoundary'
import ConnectionStatus from './components/ConnectionStatus'
import {
  KanbanPage,
  ListPage,
  DashboardPage,
  ImportPage,
  ResumesPage,
  SettingsPage,
  OnboardingPage,
  TriagePage,
  LandingPage,
  PrivacyPage,
  TermsPage,
  JobDetailPage,
} from './pages'

// Wrapper component to handle "/" route based on auth state
function HomeRoute() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/board" replace />
  }

  return <LandingPage />
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <ConnectionStatus />
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route element={<AppLayout />}>
                  <Route path="/board" element={<KanbanPage />} />
                  <Route path="/triage" element={<TriagePage />} />
                  <Route path="/list" element={<ListPage />} />
                  <Route path="/jobs/:id" element={<JobDetailPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/import" element={<ImportPage />} />
                  <Route path="/resumes" element={<ResumesPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/settings/change-password" element={<ChangePasswordPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster
              position="top-right"
              toastOptions={{
                className: 'dark:bg-slate-800 dark:text-white',
                duration: 3000,
              }}
            />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
