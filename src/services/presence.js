import { AppState } from 'react-native';
import { supabase, SUPABASE_ENABLED } from './supabaseClient';

// Presence is now server-projected. We deliberately do not subscribe to a
// globally enumerable Realtime Presence topic: only the authenticated RPC
// can return contacts whose privacy settings permit visibility.
let heartbeatTimer = null;
let pollTimer = null;
let appStateSubscription = null;
let started = false;
let inFlight = false;
let lifecycleVersion = 0;
let presenceOwnerId = null;
let onlineIds = new Set();
const listeners = new Set();

function notify() {
  listeners.forEach((cb) => cb(new Set(onlineIds)));
}

async function heartbeat(active) {
  if (!SUPABASE_ENABLED) return;
  const { error } = await supabase.rpc('heartbeat_presence', { p_active: Boolean(active) });
  if (error) throw error;
}

async function refreshVisiblePresence() {
  if (!SUPABASE_ENABLED || !started || inFlight || AppState.currentState !== 'active') return;
  const version = lifecycleVersion;
  inFlight = true;
  try {
    const { data, error } = await supabase.rpc('get_visible_presence');
    if (error) throw error;
    if (!started || version !== lifecycleVersion) return;
    onlineIds = new Set((data || []).filter((row) => row.is_online).map((row) => row.user_id));
    notify();
  } catch (_) {
    // A transient network failure must not turn unknown users into "offline".
  } finally {
    // An older request must not release the in-flight lock for a newer
    // authenticated lifecycle after sign-out/account switching.
    if (version === lifecycleVersion) inFlight = false;
  }
}

export function setPresenceOwner(userId) {
  const nextOwnerId = typeof userId === 'string' && userId.trim() ? userId.trim() : null;
  if (presenceOwnerId === nextOwnerId) {
    if (nextOwnerId && listeners.size > 0 && !started) startPresence();
    return;
  }
  presenceOwnerId = nextOwnerId;

  // A new auth identity must not inherit the previous account's online list
  // or polling timers. Do not send heartbeat(false) here: Supabase may
  // already have replaced the previous session token.
  lifecycleVersion += 1;
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (pollTimer) clearInterval(pollTimer);
  heartbeatTimer = null;
  pollTimer = null;
  inFlight = false;
  appStateSubscription?.remove?.();
  appStateSubscription = null;
  started = false;
  onlineIds = new Set();
  notify();

  if (presenceOwnerId && listeners.size > 0) startPresence();
}

export async function startPresence() {
  if (!SUPABASE_ENABLED || !presenceOwnerId || started) return;
  started = true;
  const version = ++lifecycleVersion;
  try { await heartbeat(AppState.currentState === 'active'); } catch (_) {}
  // A last subscriber may have left while the initial heartbeat was pending.
  if (!started || version !== lifecycleVersion) return;
  await refreshVisiblePresence();
  if (!started || version !== lifecycleVersion) return;

  heartbeatTimer = setInterval(() => {
    if (AppState.currentState === 'active') heartbeat(true).catch(() => {});
  }, 30000);
  pollTimer = setInterval(() => refreshVisiblePresence(), 30000);
  appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      heartbeat(true).then(refreshVisiblePresence).catch(() => {});
    } else {
      heartbeat(false).catch(() => {});
      onlineIds = new Set();
      notify();
    }
  });
}

export function stopPresence() {
  // Invalidate an in-progress start so it cannot install timers after logout.
  lifecycleVersion += 1;
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (pollTimer) clearInterval(pollTimer);
  heartbeatTimer = null;
  pollTimer = null;
  inFlight = false;
  appStateSubscription?.remove?.();
  appStateSubscription = null;
  const wasStarted = started;
  started = false;
  onlineIds = new Set();
  notify();
  return wasStarted ? heartbeat(false).catch(() => {}) : Promise.resolve();
}

export function subscribePresence(cb) {
  listeners.add(cb);
  cb(new Set(onlineIds));
  // Presence is active only while at least one authenticated screen observes it.
  startPresence();
  let subscribed = true;
  return () => {
    if (!subscribed) return;
    subscribed = false;
    listeners.delete(cb);
    if (listeners.size === 0) stopPresence();
  };
}
