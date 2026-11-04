import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { parseGoogleOAuthCallback } from '../utils/googleOAuthCallback';

function getWebRedirect() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  const configured = process.env.EXPO_PUBLIC_WEB_REDIRECT_URL;
  if (configured) return configured.replace(/\/$/, '');

  throw new Error('Web OAuth redirect URL is unavailable.');
}

export async function startGoogleOAuth(supabase) {
  if (!supabase?.auth?.signInWithOAuth) {
    throw new Error('Supabase authentication is not available.');
  }

  // Preserve the current website redirect and Supabase-managed web flow.
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getWebRedirect() },
    });
    if (error) throw error;
    return { started: true };
  }

  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error('Supabase did not return a Google sign-in URL.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  // A user closing the browser is not an authentication failure.
  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { cancelled: true };
  }
  if (result.type !== 'success' || !result.url) {
    throw new Error('Google sign-in did not return to ZannyChat.');
  }

  const callback = parseGoogleOAuthCallback(result.url);
  if (!callback) {
    throw new Error('The Google sign-in callback was invalid or incomplete.');
  }
  if (callback.error) throw new Error(callback.error);

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(callback.code);
  if (exchangeError) throw exchangeError;

  // Supabase's auth-state listener handles the signed-in navigation.
  return { started: true };
}
