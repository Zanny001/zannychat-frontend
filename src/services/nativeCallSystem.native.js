import { backendFetch } from './backendClient';
import { requireOptionalNativeModule } from 'expo-modules-core';

// Optional native-module detection keeps existing binaries safe until the
// approved native rebuild includes expo-callkit-telecom.
const nativeModule = requireOptionalNativeModule('ExpoCallKitTelecom');
const api = nativeModule ? require('expo-callkit-telecom') : null;
const nativeMappingModule = requireOptionalNativeModule('ZannyChatNativeCallMapping');

export const isNativeCallUiAvailable = Boolean(api);

export async function startNativeOutgoingCall(recipient, options = {}) {
  if (!api) return null;
  return api.startOutgoingCall(recipient, options);
}

export async function reportIncomingCallIfNeeded(call, callerName, avatarUrl) {
  if (!api || !call?.id) return null;
  try {
    const active = await api.getActiveCallSession();
    if (active?.incomingCallEvent?.serverCallId === call.id) return active.id;
    let serverEventToken = null;
    try {
      const credential = await backendFetch(`/calls/${call.id}/native-event-token`, { method: 'POST' });
      serverEventToken = credential?.token || null;
    } catch (tokenError) {
      console.warn('[calls] incoming native end credential unavailable:', tokenError?.message || tokenError);
    }
    const event = {
      eventId: call.id,
      serverCallId: call.id,
      hasVideo: call.call_type === 'video',
      startedAt: call.created_at || new Date().toISOString(),
      caller: {
        id: call.caller_id,
        displayName: callerName || 'ZannyChat contact',
        ...(avatarUrl ? { avatarUrl } : {}),
      },
      metadata: { conversationId: call.conversation_id, ...(serverEventToken ? { serverEventToken } : {}) },
    };
    return await new Promise((resolve) => {
      let settled = false;
      let subscription;
      const finish = (id) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        subscription?.remove?.();
        resolve(id || null);
      };
      const timeout = setTimeout(() => finish(null), 2500);
      subscription = api.addCallSessionAddedListener(({ session }) => {
        if (session?.incomingCallEvent?.serverCallId === call.id) finish(session.id);
      });
      api.reportIncomingCall(event).then(async () => {
        const current = await api.getActiveCallSession();
        if (current?.incomingCallEvent?.serverCallId === call.id) finish(current.id);
      }).catch(() => finish(null));
    });
  } catch (error) {
    console.warn('[calls] native incoming-call UI unavailable:', error?.message || error);
    return null;
  }
}

export function initializeNativeCallSystem(callbacks = {}) {
  if (!api) return () => {};
  const subscriptions = [
    api.addCallSessionAddedListener((event) => callbacks.onSessionAdded?.(event)),
    api.addCallAnsweredListener(async (event) => {
      let session = null;
      try { session = await api.getActiveCallSession(); } catch (_) {}
      callbacks.onAnswered?.({ ...event, session });
    }),
    api.addCallEndedListener((event) => callbacks.onEnded?.(event)),
    api.addSetMutedActionListener((event) => callbacks.onMuted?.(event)),
  ];
  Promise.resolve(api.getActiveCallSession()).then((session) => {
    if (session?.origin === 'incoming') callbacks.onSessionAdded?.({ session });
  }).catch(() => {});
  return () => subscriptions.forEach((subscription) => subscription?.remove?.());
}

export async function setPendingNativeCallMapping(serverCallId, token) {
  if (!serverCallId || !token || !nativeMappingModule) return false;
  try {
    return Boolean(await nativeMappingModule.setPendingCallMapping(serverCallId, token));
  } catch (error) {
    console.warn('[calls] could not persist pending native call mapping:', error?.message || error);
    return false;
  }
}

export async function bindPendingNativeCallMapping(nativeCallId) {
  if (!nativeCallId || !nativeMappingModule) return false;
  try {
    return Boolean(await nativeMappingModule.bindPendingCallMapping(nativeCallId));
  } catch (error) {
    console.warn('[calls] could not bind pending native call mapping:', error?.message || error);
    return false;
  }
}

export async function clearPendingNativeCallMapping() {
  if (!nativeMappingModule) return false;
  try {
    return Boolean(await nativeMappingModule.clearPendingCallMapping());
  } catch (error) {
    console.warn('[calls] could not clear pending native call mapping:', error?.message || error);
    return false;
  }
}

export async function registerNativeCallMapping(nativeCallId, serverCallId, token) {
  if (!nativeCallId || !serverCallId || !token || !nativeMappingModule) return false;
  try {
    return Boolean(await nativeMappingModule.setCallMapping(nativeCallId, serverCallId, token));
  } catch (error) {
    console.warn('[calls] could not persist native call mapping:', error?.message || error);
    return false;
  }
}

export async function getNativeCallMapping(nativeCallId) {
  if (!nativeCallId || !nativeMappingModule) return null;
  try {
    return await nativeMappingModule.getCallMapping(nativeCallId);
  } catch (_) {
    return null;
  }
}

export async function clearNativeCallMapping(nativeCallId) {
  if (!nativeCallId || !nativeMappingModule) return false;
  try {
    return Boolean(await nativeMappingModule.clearCallMapping(nativeCallId));
  } catch (_) {
    return false;
  }
}

export function answerNativeCall(nativeCallId) {
  return api && nativeCallId ? api.answerCall(nativeCallId) : Promise.resolve();
}
export function endNativeCall(nativeCallId) {
  return api && nativeCallId ? api.endCall(nativeCallId) : Promise.resolve();
}
export function reportNativeCallEnded(nativeCallId, reason = 'remoteEnded') {
  return api && nativeCallId ? api.reportCallEnded(nativeCallId, reason) : Promise.resolve();
}
export function reportNativeOutgoingConnected(nativeCallId) {
  return api && nativeCallId ? api.reportOutgoingCallConnected(nativeCallId) : Promise.resolve();
}
export function fulfillNativeIncomingConnected(requestId) {
  return api && requestId ? api.fulfillIncomingCallConnected(requestId) : Promise.resolve();
}
export function failNativeIncomingConnected(requestId) {
  return api && requestId ? api.failIncomingCallConnected(requestId) : Promise.resolve();
}
export function setNativeMuted(nativeCallId, muted) {
  return api && nativeCallId ? api.setMuted(nativeCallId, muted) : Promise.resolve();
}
export function setRTCAudioSessionConfiguration(hasVideo) {
  if (api) api.setRTCAudioSessionConfiguration(Boolean(hasVideo));
}
export function setAudioSessionPortOverride(useSpeaker) {
  if (api) api.setAudioSessionPortOverride(Boolean(useSpeaker));
}
export async function getActiveNativeCallSession() {
  return api ? api.getActiveCallSession() : null;
}
