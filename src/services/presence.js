import { supabase, SUPABASE_ENABLED } from './supabaseClient';

// Real presence via Supabase Presence, added after the Oct 2026 audit
// found every "online" dot in the app was mock data (profiles.online
// existed but nothing ever set it — and a cron-updated column would
// always be a lie by a few minutes anyway). Presence is a Realtime
// primitive: each signed-in client tracks itself on a shared channel,
// and Supabase pushes join/leave events as connections come and go —
// including the abrupt ones (app killed, network drop) via the
// server's own heartbeat, which is exactly what a column can't do.
//
// The dots mean "this person has ZannyChat open right now", nothing
// more — that's the honest reading of presence, and why this doesn't
// touch the database at all.

let channel = null;
let onlineIds = new Set();
const listeners = new Set();

function notify() {
  listeners.forEach((cb) => cb(new Set(onlineIds)));
}

function syncFromChannel() {
  if (!channel) return;
  const state = channel.presenceState();
  onlineIds = new Set(Object.keys(state));
  notify();
}

// Idempotent — safe to call on every login and app start. In mock mode
// this does nothing and screens keep showing mockData's online flags.
export async function startPresence() {
  if (!SUPABASE_ENABLED || channel) return;

  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id;
  if (!userId) return;

  channel = supabase.channel('presence:global', {
    config: { presence: { key: userId } },
  });

  channel.on('presence', { event: 'sync' }, syncFromChannel);

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ online_at: new Date().toISOString() });
    }
  });
}

export function stopPresence() {
  if (!channel) return;
  supabase.removeChannel(channel);
  channel = null;
  onlineIds = new Set();
  notify();
}

// cb receives a Set of currently-online user ids (immediately with the
// current snapshot, then on every change). Returns an unsubscribe fn.
export function subscribePresence(cb) {
  listeners.add(cb);
  cb(new Set(onlineIds));
  return () => listeners.delete(cb);
}
