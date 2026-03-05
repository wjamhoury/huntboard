import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useNewJobsCount } from '../hooks/useTriageJobs'
import MobileBottomNav from '../components/mobile/MobileBottomNav'
import {
  LayoutDashboard,
  List,
  BarChart3,
  Rss,
  FileText,
  Settings,
  LogOut,
  Moon,
  Sun,
  User,
  Layers,
} from 'lucide-react'

const navItems = [
  { to: '/board', icon: LayoutDashboard, label: 'Board' },
  { to: '/triage', icon: Layers, label: 'Triage', showBadge: true },
  { to: '/list', icon: List, label: 'List' },
  { to: '/dashboard', icon: BarChart3, label: 'Dashboard' },
  { to: '/import', icon: Rss, label: 'Sources' },
  { to: '/resumes', icon: FileText, label: 'Resumes' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function AppLayout() {
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark')
  })
  const { user, userProfile, logout } = useAuth()
  const navigate = useNavigate()
  const newJobsCount = useNewJobsCount()

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light')
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Desktop Sidebar - completely hidden on mobile */}
      <aside className="hidden md:block fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">HuntBoard</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map(({ to, icon: Icon, label, showBadge }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`
                }
              >
                <Icon size={20} />
                <span className="font-medium">{label}</span>
                {showBadge && newJobsCount > 0 && (
                  <span className="ml-auto px-2 py-0.5 text-xs font-bold bg-blue-500 text-white rounded-full">
                    {newJobsCount > 99 ? '99+' : newJobsCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors mb-2"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              <span className="font-medium">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            {/* User info */}
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <User size={16} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {userProfile?.full_name || user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content - add left margin only on desktop */}
      <main className="md:ml-64 pb-20 md:pb-0 overflow-x-hidden">
        <Outlet />
      </main>

      {/* Mobile bottom navigation with More menu */}
      <MobileBottomNav
        newJobsCount={newJobsCount}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onLogout={handleLogout}
      />
    </div>
  )
}
