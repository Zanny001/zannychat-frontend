import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { parseGoogleOAuthCallback } from '../utils/googleOAuthCallback';
import { getOAuthRedirectUrl } from '../utils/oauthRedirect';

const callbackExchanges = new Map();

export async function completeGoogleOAuthCallback(supabase, callbackUrl) {
  const callback = parseGoogleOAuthCallback(callbackUrl);
  if (!callback) throw new Error('The Google sign-in callback was invalid or incomplete.');
  if (callback.error) throw new Error(callback.error);
  if (!supabase?.auth?.exchangeCodeForSession) throw new Error('Supabase authentication is not available.');
  if (callbackExchanges.has(callback.code)) return callbackExchanges.get(callback.code);
  const exchange = supabase.auth.exchangeCodeForSession(callback.code).then(({ error }) => {
    if (error) throw error;
    return { completed: true };
  });
  callbackExchanges.set(callback.code, exchange);
  try { return await exchange; } catch (error) { callbackExchanges.delete(callback.code); throw error; }
}

export async function startGoogleOAuth(supabase, { prompt } = {}) {
  if (!supabase?.auth?.signInWithOAuth) {
    throw new Error('Supabase authentication is not available.');
  }

  const reauthQueryParams = prompt ? { queryParams: { prompt } } : {};

  // Preserve the current website redirect and Supabase-managed web flow.
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getOAuthRedirectUrl(), ...reauthQueryParams },
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
      ...reauthQueryParams,
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

  await completeGoogleOAuthCallback(supabase, result.url);

  // Supabase's auth-state listener handles the signed-in navigation.
  return { started: true };
}
