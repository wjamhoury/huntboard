import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth'
import toast from 'react-hot-toast'
import { Briefcase, Mail, Lock, Loader2, ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

const PASSWORD_REQUIREMENTS = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
  { label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export default function ForgotPasswordPage() {
  const [step, setStep] = useState('email') // 'email', 'code', or 'success'
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const isDevMode = import.meta.env.VITE_AUTH_DEV_MODE === 'true'

  const handleSendCode = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Please enter your email address')
      return
    }

    setIsLoading(true)
    try {
      if (isDevMode) {
        toast.success('Dev mode: Skipping email, go to step 2')
        setStep('code')
        return
      }

      await resetPassword({ username: email })
      toast.success('Reset code sent! Check your email.')
      setStep('code')
    } catch (error) {
      const message = error.message || 'Failed to send reset code'
      if (error.name === 'UserNotFoundException') {
        toast.error('No account found with this email address')
      } else if (error.name === 'LimitExceededException') {
        toast.error('Too many attempts. Please try again later.')
      } else {
        toast.error(message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()

    if (!code.trim()) {
      toast.error('Please enter the verification code')
      return
    }

    // Validate password requirements
    const failedRequirements = PASSWORD_REQUIREMENTS.filter((req) => !req.test(newPassword))
    if (failedRequirements.length > 0) {
      toast.error(`Password must have: ${failedRequirements[0].label.toLowerCase()}`)
      return
    }

    setIsLoading(true)
    try {
      if (isDevMode) {
        toast.success('Dev mode: Password reset simulated')
        setStep('success')
        return
      }

      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword,
      })
      toast.success('Password reset successfully!')
      setStep('success')
    } catch (error) {
      const message = error.message || 'Failed to reset password'
      if (error.name === 'CodeMismatchException') {
        toast.error('Invalid verification code. Please check and try again.')
      } else if (error.name === 'ExpiredCodeException') {
        toast.error('Verification code has expired. Please request a new one.')
      } else if (error.name === 'InvalidPasswordException') {
        toast.error('Password does not meet requirements')
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Briefcase className="text-blue-600" size={32} />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">HuntBoard</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            {step === 'email' && 'Reset your password'}
            {step === 'code' && 'Enter verification code'}
            {step === 'success' && 'Password reset complete'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          {isDevMode && (
            <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 rounded-lg text-sm">
              Dev mode enabled - password reset is simulated
            </div>
          )}

          {/* Step 1: Email Input */}
          {step === 'email' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Enter the email address associated with your account and we'll send you a verification code.
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  'Send Reset Code'
                )}
              </button>
            </form>
          )}

          {/* Step 2: Code + New Password */}
          {step === 'code' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                We sent a verification code to <strong>{email}</strong>. Enter it below along with your new password.
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
                  placeholder="123456"
                  maxLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-12 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Resetting password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Didn't receive the code? Try again
              </button>
            </form>
          )}

          {/* Step 3: Success */}
          {step === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Password Reset Complete
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Your password has been reset successfully. You can now sign in with your new password.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
