import { Platform } from 'react-native';

// Temporary production domain while the original Netlify site's deploy quota
// is exhausted. Keep this central so OAuth, signup confirmation and recovery
// all use the same destination even when users arrive through the old domain.
export const PRODUCTION_WEB_REDIRECT_URL = 'https://zannychat.netlify.app';

function getWebOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const currentOrigin = window.location.origin.replace(/\/$/, '');
    // Migrate visitors arriving through the old production hostname to the
    // temporary site. Other origins (localhost and deploy previews) stay local.
    if (currentOrigin === 'https://zannychat-app.netlify.app') {
      return PRODUCTION_WEB_REDIRECT_URL;
    }
    return currentOrigin;
  }

  const configured = process.env.EXPO_PUBLIC_WEB_REDIRECT_URL;
  if (configured) {
    const normalized = configured.replace(/\/$/, '');
    return normalized === 'https://zannychat-app.netlify.app'
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
