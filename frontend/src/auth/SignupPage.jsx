import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import toast from 'react-hot-toast'
import { Briefcase, Mail, Lock, User, Loader2, ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

const PASSWORD_REQUIREMENTS = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
  { label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export default function SignupPage() {
  const [step, setStep] = useState('signup') // 'signup' or 'confirm'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmCode, setConfirmCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { signupWithEmail, confirmSignup, isDevMode } = useAuth()
  const navigate = useNavigate()

  const isValidEmail = useMemo(() => {
    if (!email) return true // Don't show error when empty
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }, [email])

  const passwordStrength = useMemo(() => {
    const passedCount = PASSWORD_REQUIREMENTS.filter((req) => req.test(password)).length
    if (passedCount <= 2) return { label: 'Weak', color: 'bg-red-500', width: '33%' }
    if (passedCount <= 4) return { label: 'Medium', color: 'bg-yellow-500', width: '66%' }
    return { label: 'Strong', color: 'bg-green-500', width: '100%' }
  }, [password])

  const allRequirementsMet = useMemo(() => {
    return PASSWORD_REQUIREMENTS.every((req) => req.test(password))
  }, [password])

  const handleSignup = async (e) => {
    e.preventDefault()

    // Validate email format
    if (!isValidEmail) {
      toast.error('Please enter a valid email address')
      return
    }

    // Check password requirements
    if (!allRequirementsMet) {
      const failedReq = PASSWORD_REQUIREMENTS.find((req) => !req.test(password))
      toast.error(`Password must have: ${failedReq.label.toLowerCase()}`)
      return
    }

    setIsLoading(true)

    try {
      const result = await signupWithEmail(email, password, name)
      if (result.nextStep?.signUpStep === 'CONFIRM_SIGN_UP') {
        setStep('confirm')
        toast.success('Please check your email for a confirmation code')
      } else if (result.nextStep?.signUpStep === 'DONE' || isDevMode) {
        toast.success('Account created successfully!')
        navigate('/login', { replace: true })
      }
    } catch (error) {
      const message = error.message || 'Failed to create account'
      if (error.name === 'UsernameExistsException') {
        toast.error('An account with this email already exists')
      } else if (error.name === 'InvalidPasswordException') {
        toast.error('Password does not meet requirements')
      } else {
        toast.error(message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await confirmSignup(email, confirmCode)
      toast.success('Account confirmed! Please sign in.')
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error(error.message || 'Failed to confirm account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Briefcase className="text-blue-600" size={32} />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">HuntBoard</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            {step === 'signup' ? 'Create your account' : 'Confirm your email'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          {isDevMode && (
            <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 rounded-lg text-sm">
              Dev mode enabled - signup is simulated
            </div>
          )}

          {step === 'signup' ? (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 md:py-2 text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your name"
                  />
                </div>
              </div>

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
                    className={`w-full pl-10 pr-4 py-3 md:py-2 text-base border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      email && !isValidEmail
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                    placeholder="you@example.com"
                  />
                </div>
                {email && !isValidEmail && (
                  <p className="mt-1 text-xs text-red-500">Please enter a valid email address</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-12 py-3 md:py-2 text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Password strength</span>
                      <span className={`font-medium ${
                        passwordStrength.label === 'Weak' ? 'text-red-500' :
                        passwordStrength.label === 'Medium' ? 'text-yellow-500' : 'text-green-500'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: passwordStrength.width }}
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
                        password && req.test(password)
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <CheckCircle2 size={12} className={password && req.test(password) ? 'opacity-100' : 'opacity-30'} />
                      {req.label}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 md:py-2 text-base bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleConfirm} className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                We sent a confirmation code to <strong>{email}</strong>. Please enter it below.
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Confirmation Code
                </label>
                <input
                  type="text"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  required
                  className="w-full px-4 py-3 md:py-2 text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
                  placeholder="123456"
                  maxLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 md:py-2 text-base bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  'Confirm account'
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('signup')}
                className="w-full text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Back to signup
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
