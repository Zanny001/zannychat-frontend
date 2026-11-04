import { Platform } from 'react-native';

// On web, return to the exact origin serving the app (production Netlify
// domain or an explicitly allow-listed local development origin). A hard-coded
// stale domain can complete Google OAuth successfully but return users to a
// different deployment where their app/session state is unavailable.
export function getOAuthRedirectUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  // Native builds must allow this URL in Supabase Auth > URL Configuration and
  // handle the scheme in the app. The web deployment is the primary current flow.
  return 'zannychat://auth/callback';
}


// Password recovery needs a browser callback on web and the app scheme on
// native. A native-only redirect silently breaks desktop/browser recovery.
export function getPasswordRecoveryRedirectUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/?reset-password=1`;
  }
  return 'zannychat://reset-password';
}
