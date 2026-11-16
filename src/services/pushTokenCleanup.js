/**
 * Delete push-token rows while the caller still has an authenticated session.
 * Pass expoPushToken for device-local sign-out; omit it only for explicit
 * account-wide sign-out. Never turn a failed token lookup into an all-device
 * delete.
 */
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
