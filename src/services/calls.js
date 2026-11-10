import { supabase, SUPABASE_ENABLED } from './supabaseClient';
import { backendFetch } from './backendClient';
import { startNativeOutgoingCall, setPendingNativeCallMapping, bindPendingNativeCallMapping, clearPendingNativeCallMapping } from './nativeCallSystem';

function requireCalls() {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Calls require a configured, signed-in ZannyChat account.');
}

export async function getCallUserId() {
  requireCalls();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user?.id) throw new Error('Sign in before making a call.');
  return data.user.id;
}

export async function startCall({ conversationId, calleeId, callType }) {
  requireCalls();
  if (!conversationId || !calleeId || !['audio', 'video'].includes(callType)) throw new Error('Invalid call details.');
  const callerId = await getCallUserId();
  if (callerId === calleeId) throw new Error('You cannot call yourself.');
  const { data, error } = await supabase.from('call_sessions').insert({
    conversation_id: conversationId,
    caller_id: callerId,
    callee_id: calleeId,
    call_type: callType,
  }).select('id,conversation_id,caller_id,callee_id,call_type,status,created_at,expires_at').single();
  if (error) throw new Error(error.message || 'Unable to start call.');
  // The database trigger queues a durable invitation. Kick the trusted
  // backend worker immediately; native VoIP push handles lock-screen calls,
  // while Expo push and Realtime remain compatibility fallbacks.
  backendFetch(`/calls/${data.id}/notify`, { method: 'POST' }).catch((pushError) => {
    console.warn('[calls] push invitation kick failed; queue will retry:', pushError?.message || pushError);
  });
  let nativeCallId = null;
  let nativeSessionCreationStarted = false;
  try {
    // Remove any orphaned pre-session record left by a previous failed native start.
    await clearPendingNativeCallMapping();
    // Obtain a short-lived, server-signed token before creating the OS call.
    // It is bound to this caller and call, and is stored only by the native
    // app-private mapping module so Android can reconcile an end event when
    // the JavaScript process has been killed.
    let nativeEventToken = null;
    try {
      const eventCredential = await backendFetch(`/calls/${data.id}/native-event-token`, { method: 'POST' });
      nativeEventToken = eventCredential?.token || null;
    } catch (tokenError) {
      console.warn('[calls] native end reconciliation credential unavailable:', tokenError?.message || tokenError);
    }
    const pendingMappingPersisted = nativeEventToken
      ? await setPendingNativeCallMapping(data.id, nativeEventToken)
      : false;
    if (!pendingMappingPersisted) {
      // Do not create an OS call that cannot be reconciled after process death.
      await clearPendingNativeCallMapping();
      console.warn('[calls] native outgoing UI skipped; signed reconciliation storage is unavailable');
    } else {
      const displayName = await getCallParticipantName(calleeId);
      nativeSessionCreationStarted = true;
      nativeCallId = await startNativeOutgoingCall(
        { id: calleeId, displayName },
        { hasVideo: callType === 'video' },
      );
      if (nativeCallId) {
        const bound = await bindPendingNativeCallMapping(nativeCallId);
        if (!bound) console.warn('[calls] native outgoing call mapping remains pending for killed-app recovery');
      } else {
        await clearPendingNativeCallMapping();
      }
    }
  } catch (nativeError) {
    // Keep the pending mapping if Telecom creation began: the native session
    // may exist even if its generated ID never made it back to JavaScript.
    if (!nativeSessionCreationStarted) await clearPendingNativeCallMapping();
    console.warn('[calls] native outgoing UI unavailable:', nativeError?.message || nativeError);
  }
  return { ...data, nativeCallId };
}

export async function updateCallStatus(callId, status) {
  requireCalls();
  if (!callId || !['accepted', 'declined', 'cancelled', 'ended', 'missed'].includes(status)) throw new Error('Invalid call state.');
  const { data, error } = await supabase.from('call_sessions').update({ status }).eq('id', callId)
    .select('id,status,caller_id,callee_id,call_type,conversation_id').single();
  if (error) throw new Error(error.message || 'Unable to update call.');
  if (['declined', 'cancelled', 'ended', 'missed', 'failed'].includes(status)) {
    backendFetch(`/calls/${callId}/end-notify`, { method: 'POST', body: JSON.stringify({ status }) }).catch((pushError) => {
      console.warn('[calls] native call-end notification unavailable:', pushError?.message || pushError);
    });
  }
  return data;
}

export async function getCallSessionById(callId) {
  requireCalls();
  if (!callId) return null;
  const { data, error } = await supabase.from('call_sessions')
    .select('id,conversation_id,caller_id,callee_id,call_type,status,created_at,expires_at')
    .eq('id', callId).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function registerCallVoipToken(token, type) {
  if (!token || !['APNS_VOIP', 'FCM'].includes(type)) return null;
  return backendFetch('/calls/voip-token', {
    method: 'POST',
    body: JSON.stringify({ token, type }),
  });
}

export async function listCallHistory(limit = 100) {
  if (!SUPABASE_ENABLED || !supabase) return [];
  const userId = await getCallUserId();
  const selection = 'id,conversation_id,caller_id,callee_id,call_type,status,created_at,accepted_at,ended_at,expires_at';
  const loadRows = async () => {
    const { data, error } = await supabase.from('call_sessions').select(selection)
      .or(`caller_id.eq.${userId},callee_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(Number(limit) || 100, 200)));
    if (error) throw error;
    return data || [];
  };
  let rows = await loadRows();
  const expired = rows.filter((row) => row.status === 'ringing'
    && Number.isFinite(Date.parse(row.expires_at)) && Date.parse(row.expires_at) <= Date.now());
  if (expired.length) {
    await Promise.all(expired.map((row) => updateCallStatus(row.id, 'missed').catch(() => null)));
    rows = await loadRows();
  }
  const peerIds = [...new Set(rows.map((row) => row.caller_id === userId ? row.callee_id : row.caller_id).filter(Boolean))];
  let profilesById = {};
  if (peerIds.length) {
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('id,name,avatar_color').in('id', peerIds);
    if (!profileError) profilesById = Object.fromEntries((profiles || []).map((profile) => [profile.id, profile]));
  }
  const directCalls = rows.map((row) => {
    const peerId = row.caller_id === userId ? row.callee_id : row.caller_id;
    const profile = profilesById[peerId] || {};
    const duration = row.accepted_at && row.ended_at ? Math.max(0, Math.floor((Date.parse(row.ended_at) - Date.parse(row.accepted_at)) / 1000)) : 0;
    return { ...row, direction: row.caller_id === userId ? 'outgoing' : 'incoming',
      participantName: profile.name || 'ZannyChat contact', avatarColor: profile.avatar_color || '#6C5CE7',
      durationSeconds: Number.isFinite(duration) ? duration : 0 };
  });
  try {
    const groupResult = await backendFetch(`/group-calls/history?limit=${Math.max(1, Math.min(Number(limit) || 100, 200))}`);
    const groupCalls = Array.isArray(groupResult?.calls) ? groupResult.calls : [];
    return [...directCalls, ...groupCalls]
      .sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0))
      .slice(0, Math.max(1, Math.min(Number(limit) || 100, 200)));
  } catch (error) {
    console.warn('[calls] group call history unavailable:', error?.message || error);
    return directCalls;
  }
}

export async function sendCallSignal({ call, type, payload }) {
  requireCalls();
  if (!call?.id || !['offer', 'answer', 'ice-candidate'].includes(type) || !payload || typeof payload !== 'object') {
    throw new Error('Invalid call signal.');
  }
  const senderId = await getCallUserId();
  const recipientId = senderId === call.caller_id ? call.callee_id : senderId === call.callee_id ? call.caller_id : null;
  if (!recipientId) throw new Error('You are not a participant in this call.');
  const { error } = await supabase.from('call_signals').insert({
    call_id: call.id, sender_id: senderId, recipient_id: recipientId, signal_type: type, payload,
  });
  if (error) throw new Error(error.message || 'Unable to send call signal.');
}

export function subscribeToCallSignals(callId, onSignal, onReady = () => {}) {
  if (!SUPABASE_ENABLED || !supabase || !callId) return () => {};
  const channel = supabase.channel(`call-signals:${callId}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_signals', filter: `call_id=eq.${callId}` }, (event) => {
      if (event?.new) onSignal(event.new);
    })
    .subscribe((status) => { if (status === 'SUBSCRIBED') onReady(); });
  return () => { supabase.removeChannel(channel).catch(() => {}); };
}

export function subscribeToCallSession(callId, onChange, onReady = () => {}) {
  if (!SUPABASE_ENABLED || !supabase || !callId) return () => {};
  const channel = supabase.channel(`call-session:${callId}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'call_sessions', filter: `id=eq.${callId}` }, (event) => {
      if (event?.new) onChange(event.new);
    })
    .subscribe((status) => { if (status === 'SUBSCRIBED') onReady(); });
  return () => { supabase.removeChannel(channel).catch(() => {}); };
}

export function subscribeToIncomingCalls(userId, onCall) {
  if (!SUPABASE_ENABLED || !supabase || !userId) return () => {};
  const channel = supabase.channel(`incoming-calls:${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_sessions', filter: `callee_id=eq.${userId}` }, (event) => {
      if (event?.new?.status === 'ringing' && new Date(event.new.expires_at).getTime() > Date.now()) onCall(event.new);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel).catch(() => {}); };
}

export async function getCallParticipantName(userId) {
  requireCalls();
  const { data, error } = await supabase.from('profiles').select('name,avatar_color').eq('id', userId).maybeSingle();
  if (error) return 'ZannyChat contact';
  return data?.name || 'ZannyChat contact';
}
