// CRITICAL: Import amplifyConfig FIRST - it configures Amplify before any auth imports
import { isDevMode } from '../amplifyConfig'

import { createContext, useContext, useState, useEffect } from 'react'
import { signIn, signUp, confirmSignUp, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth'
import { usersApi } from '../services/api'

const AuthContext = createContext(null)

const DEV_USER = {
  id: 'dev-user-123',
  email: 'dev@example.com',
  name: 'Dev User',
  authMethod: 'dev',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const fetchUserProfile = async () => {
    try {
      setProfileLoading(true)
      const response = await usersApi.getMe()
      setUserProfile(response.data)
      return response.data
    } catch (err) {
      console.error('Failed to fetch user profile:', err)
      return null
    } finally {
      setProfileLoading(false)
    }
  }

  const checkAuth = async () => {
    if (isDevMode) {
      setUser(DEV_USER)
      // Fetch profile for dev user too
      await fetchUserProfile()
      setLoading(false)
      return
    }

    try {
      const currentUser = await getCurrentUser()
      // Detect auth method from sign-in details or identity provider
      const signInDetails = currentUser.signInDetails || {}
      let authMethod = 'email'
      if (signInDetails.authFlowType === 'USER_SRP_AUTH') {
        authMethod = 'email'
      } else if (signInDetails.loginId?.includes('linkedin') || currentUser.username?.includes('LinkedIn')) {
        authMethod = 'linkedin'
      }

      setUser({
        id: currentUser.userId,
        email: signInDetails.loginId || currentUser.username,
        name: currentUser.username,
        authMethod,
      })

      // Fetch user profile from backend
      await fetchUserProfile()
    } catch {
      setUser(null)
      setUserProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const loginWithEmail = async (email, password) => {
    if (isDevMode) {
      setUser(DEV_USER)
      await fetchUserProfile()
      return
    }

    const result = await signIn({ username: email, password })
    if (result.isSignedIn) {
      await checkAuth()
    }
    return result
  }

  const signupWithEmail = async (email, password, name) => {
    if (isDevMode) {
      return { isSignUpComplete: true, nextStep: { signUpStep: 'DONE' } }
    }

    const result = await signUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          name,
        },
      },
    })
    return result
  }

  const confirmSignup = async (email, code) => {
    if (isDevMode) {
      return { isSignUpComplete: true }
    }

    const result = await confirmSignUp({ username: email, confirmationCode: code })
    return result
  }

  const loginWithLinkedIn = async () => {
    if (isDevMode) {
      setUser(DEV_USER)
      return
    }

    // LinkedIn OAuth via Cognito hosted UI
    const domain = import.meta.env.VITE_COGNITO_DOMAIN
    const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID
    if (domain && clientId) {
      const redirectUri = encodeURIComponent(window.location.origin)
      window.location.href = `https://${domain}/oauth2/authorize?identity_provider=LinkedIn&response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=openid+email+profile`
    }
  }

  const logout = async () => {
    if (isDevMode) {
      setUser(null)
      return
    }

    await signOut()
    setUser(null)
  }

  const getAccessToken = async () => {
    if (isDevMode) {
      return 'dev-token'
    }

    try {
      const session = await fetchAuthSession()
      // Use ID token instead of access token - ID token contains user attributes (email, name)
      return session.tokens?.idToken?.toString()
    } catch {
      return null
    }
  }

  const value = {
    user,
    userProfile,
    loading,
    profileLoading,
    isAuthenticated: !!user,
    onboardingComplete: userProfile?.onboarding_complete ?? true, // Default to true to avoid flash
    isDevMode,
    loginWithEmail,
    signupWithEmail,
    confirmSignup,
    loginWithLinkedIn,
    logout,
    getAccessToken,
    refreshProfile: fetchUserProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
