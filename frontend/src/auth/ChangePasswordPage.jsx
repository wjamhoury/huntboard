import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updatePassword } from 'aws-amplify/auth'
import toast from 'react-hot-toast'
import { Lock, Loader2, ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useAuth } from './AuthProvider'

const PASSWORD_REQUIREMENTS = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
  { label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { isDevMode, user } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    // Validate password requirements
    const failedRequirements = PASSWORD_REQUIREMENTS.filter((req) => !req.test(newPassword))
    if (failedRequirements.length > 0) {
      toast.error(`Password must have: ${failedRequirements[0].label.toLowerCase()}`)
      return
    }

    // Check that new password is different from current
    if (currentPassword === newPassword) {
      toast.error('New password must be different from current password')
      return
    }

    setIsLoading(true)
    try {
      if (isDevMode) {
        toast.success('Dev mode: Password change simulated')
        navigate('/settings')
        return
      }

      await updatePassword({
        oldPassword: currentPassword,
        newPassword: newPassword,
      })
      toast.success('Password changed successfully!')
      navigate('/settings')
    } catch (error) {
      const message = error.message || 'Failed to change password'
      if (error.name === 'NotAuthorizedException') {
        toast.error('Current password is incorrect')
      } else if (error.name === 'InvalidPasswordException') {
        toast.error('New password does not meet requirements')
      } else if (error.name === 'LimitExceededException') {
        toast.error('Too many attempts. Please try again later.')
      } else {
        toast.error(message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getPasswordStrength = () => {
    const passedCount = PASSWORD_REQUIREMENTS.filter((req) => req.test(newPassword)).length
    if (passedCount <= 2) return { label: 'Weak', color: 'bg-red-500', width: '33%' }
    if (passedCount <= 4) return { label: 'Medium', color: 'bg-yellow-500', width: '66%' }
    return { label: 'Strong', color: 'bg-green-500', width: '100%' }
  }

  const strength = getPasswordStrength()
  const passwordsMatch = confirmPassword && newPassword === confirmPassword

  return (
    <div className="p-4 pb-20 md:pb-4 max-w-xl mx-auto">
      <button
        onClick={() => navigate('/settings')}
        className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to settings
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Change Password</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Update your account password for {user?.email}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        {isDevMode && (
          <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 rounded-lg text-sm">
            Dev mode enabled - password change is simulated
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Current Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoFocus
                className="w-full pl-10 pr-12 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full pl-10 pr-12 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500 dark:text-slate-400">Password strength</span>
                  <span className={`font-medium ${
                    strength.label === 'Weak' ? 'text-red-500' :
                    strength.label === 'Medium' ? 'text-yellow-500' : 'text-green-500'
                  }`}>
                    {strength.label}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${strength.color} transition-all duration-300`}
                    style={{ width: strength.width }}
                  />
                </div>
              </div>
            )}

            {/* Password Requirements */}
            <div className="mt-3 space-y-1">
              {PASSWORD_REQUIREMENTS.map((req, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 text-xs ${
                    newPassword && req.test(newPassword)
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <CheckCircle2 size={12} className={newPassword && req.test(newPassword) ? 'opacity-100' : 'opacity-30'} />
                  {req.label}
                </div>
              ))}
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`w-full pl-10 pr-12 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  confirmPassword && !passwordsMatch
                    ? 'border-red-500 dark:border-red-500'
                    : confirmPassword && passwordsMatch
                    ? 'border-green-500 dark:border-green-500'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
            )}
            {confirmPassword && passwordsMatch && (
              <p className="mt-1 text-xs text-green-500 flex items-center gap-1">
                <CheckCircle2 size={12} /> Passwords match
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="flex-1 py-2 px-4 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !passwordsMatch}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
