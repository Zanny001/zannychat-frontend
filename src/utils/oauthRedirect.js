import { Platform } from 'react-native';

// Canonical production destination for OAuth, signup confirmation and password recovery.
export const PRODUCTION_WEB_REDIRECT_URL = 'https://zannychat.vercel.app';

function getWebOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const currentOrigin = window.location.origin.replace(/\/$/, '');
    // Migrate visitors arriving through legacy production hostnames. Other
    // origins (localhost and deploy previews) stay local.
    if (currentOrigin === 'https://zannychat-app.netlify.app' || currentOrigin === 'https://zannychat.netlify.app') {
      return PRODUCTION_WEB_REDIRECT_URL;
    }
    return currentOrigin;
  }

  const configured = process.env.EXPO_PUBLIC_WEB_REDIRECT_URL;
  if (configured) {
    const normalized = configured.replace(/\/$/, '');
    return normalized === 'https://zannychat-app.netlify.app' || normalized === 'https://zannychat.netlify.app'
      ? PRODUCTION_WEB_REDIRECT_URL
      : normalized;
  }

  return PRODUCTION_WEB_REDIRECT_URL;
}

export function getOAuthRedirectUrl() {
  if (Platform.OS === 'web') return getWebOrigin();
  return 'zannychat://auth/callback';
}

export function getPasswordRecoveryRedirectUrl() {
  if (Platform.OS === 'web') return `${getWebOrigin()}/?reset-password=1`;
  return 'zannychat://reset-password';
}
