/**
 * Delete push-token rows while the caller still has an authenticated session.
 * Pass expoPushToken for device-local sign-out; omit it only for explicit
 * account-wide sign-out. Never turn a failed token lookup into an all-device
 * delete.
 */
import { clearExpoPushToken, readExpoPushToken } from './pushTokenDeviceStorage';

export async function deletePushTokenRows({ supabase, userId, expoPushToken = null }) {
  if (!supabase || typeof supabase.from !== 'function') {
    throw new TypeError('Push-token cleanup requires a Supabase client.');
  }
  if (typeof userId !== 'string' || !userId) {
    throw new TypeError('Push-token cleanup requires an authenticated user id.');
  }
  if (expoPushToken !== null && (typeof expoPushToken !== 'string' || !expoPushToken)) {
    throw new TypeError('Device-local push-token cleanup requires a valid Expo token.');
  }

  let query = supabase.from('push_tokens').delete().eq('user_id', userId);
  if (expoPushToken) query = query.eq('expo_push_token', expoPushToken);
  const { error } = await query;
  if (error) throw error;
  return true;
}


/**
 * Revoke this device's cached Expo token on local sign-out, or all account
 * tokens only for an explicit global sign-out. The local cache is cleared
 * only after the database deletion succeeds, so failures remain retryable.
 */
export async function cleanupExpoPushTokensForSignOut({
  supabase,
  storage,
  userId,
  scope = 'local',
  resolveExpoPushToken = null,
}) {
  if (scope === 'global') {
    await deletePushTokenRows({ supabase, userId });
    await clearExpoPushToken({ storage, userId });
    return true;
  }
  if (scope !== 'local') throw new TypeError('Push-token cleanup scope must be local or global.');

  let expoPushToken = await readExpoPushToken({ storage, userId });
  if (!expoPushToken && typeof resolveExpoPushToken === 'function') {
    expoPushToken = await resolveExpoPushToken();
  }
  if (!expoPushToken) return false;

  await deletePushTokenRows({ supabase, userId, expoPushToken });
  await clearExpoPushToken({ storage, userId });
  return true;
}
