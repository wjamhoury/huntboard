// CRITICAL: This file MUST be imported at the TOP of main.jsx
// BEFORE any other imports, to ensure Amplify is configured
// before aws-amplify/auth initializes

import { Amplify } from 'aws-amplify'

const isDevMode = import.meta.env.VITE_AUTH_DEV_MODE === 'true'

const cognitoConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_H05jUkMV7',
      userPoolClientId: '5gmo5ojqegpnqqi28cnml0o2fb',
    },
  },
}

// Configure immediately at module load time
console.log('=== AMPLIFY CONFIG ===')
console.log('About to configure Amplify with:', JSON.stringify(cognitoConfig, null, 2))
Amplify.configure(cognitoConfig)

// Verify configuration was applied
const appliedConfig = Amplify.getConfig()
console.log('Amplify.getConfig() after configure:', JSON.stringify(appliedConfig, null, 2))
console.log('Auth config specifically:', JSON.stringify(appliedConfig.Auth, null, 2))

if (!appliedConfig.Auth?.Cognito?.userPoolId) {
  console.error('CRITICAL: Amplify Auth config is missing userPoolId!')
}

export { isDevMode }
