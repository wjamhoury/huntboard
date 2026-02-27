import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  List,
  BarChart3,
  Rss,
  FileText,
  Settings,
  Layers,
  MoreHorizontal,
  X,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react'

const PRIMARY_NAV = [
  { to: '/board', icon: LayoutDashboard, label: 'Board' },
  { to: '/triage', icon: Layers, label: 'Triage', showBadge: true },
  { to: '/list', icon: List, label: 'List' },
  { to: '/import', icon: Rss, label: 'Sources' },
]

const MORE_NAV = [
  { to: '/dashboard', icon: BarChart3, label: 'Dashboard' },
  { to: '/resumes', icon: FileText, label: 'Resumes' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function MobileBottomNav({ newJobsCount = 0, darkMode, onToggleDarkMode, onLogout }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  // Close sheet when navigating or pressing escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMoreOpen) {
        setIsMoreOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isMoreOpen])

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isMoreOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMoreOpen])

  return (
    <>
      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 md:hidden z-40 safe-area-pb">
        <div className="flex justify-around items-center h-16">
          {PRIMARY_NAV.map(({ to, icon: Icon, label, showBadge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[64px] min-h-[44px] ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`
              }
            >
              <div className="relative">
                <Icon size={22} strokeWidth={2} />
                {showBadge && newJobsCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-blue-500 text-white rounded-full flex items-center justify-center">
                    {newJobsCount > 99 ? '99+' : newJobsCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}

          {/* More Button */}
          <button
            onClick={() => setIsMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[64px] min-h-[44px] text-slate-500 dark:text-slate-400"
          >
            <MoreHorizontal size={22} strokeWidth={2} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* More Menu Slide-up Sheet */}
      {isMoreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50 md:hidden animate-fade-in"
            onClick={() => setIsMoreOpen(false)}
          />

          {/* Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-50 md:hidden animate-slide-up">
            <div className="bg-white dark:bg-slate-800 rounded-t-2xl shadow-xl max-h-[70vh] overflow-hidden">
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">More</h2>
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Navigation Items */}
              <div className="py-2">
                {MORE_NAV.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setIsMoreOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-4 px-4 py-3 min-h-[48px] ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`
                    }
                  >
                    <Icon size={22} />
                    <span className="font-medium">{label}</span>
                  </NavLink>
                ))}
              </div>

              {/* Divider */}
              <div className="border-t border-slate-200 dark:border-slate-700 my-2" />

              {/* Dark Mode Toggle */}
              <button
                onClick={() => {
                  onToggleDarkMode()
                  setIsMoreOpen(false)
                }}
                className="flex items-center gap-4 px-4 py-3 min-h-[48px] w-full text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                {darkMode ? <Sun size={22} /> : <Moon size={22} />}
                <span className="font-medium">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>

              {/* Logout */}
              <button
                onClick={() => {
                  onLogout()
                  setIsMoreOpen(false)
                }}
                className="flex items-center gap-4 px-4 py-3 min-h-[48px] w-full text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut size={22} />
                <span className="font-medium">Sign out</span>
              </button>

              {/* Safe area padding at bottom */}
              <div className="h-safe-area-b" />
            </div>
          </div>
        </>
      )}
    </>
  )
}
