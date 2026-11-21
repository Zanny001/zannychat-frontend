import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const nativeCall = fs.readFileSync(new URL('./CallScreen.js', import.meta.url), 'utf8');
const webCall = fs.readFileSync(new URL('./CallScreen.web.js', import.meta.url), 'utf8');
const nativeRoom = fs.readFileSync(new URL('./GroupCallScreen.js', import.meta.url), 'utf8');
const webRoom = fs.readFileSync(new URL('./GroupCallScreen.web.js', import.meta.url), 'utf8');

test('accepted native and web direct calls request a participant-scoped LiveKit token before connecting media', () => {
  for (const source of [nativeCall, webCall]) {
    assert.match(source, /navigateToDirectLiveKit/);
    assert.match(source, /\/calls\/\$\{(?:liveCall|next)\.id\}\/livekit-token/);
    assert.match(source, /directCallId: currentCall\.id/);
    assert.match(source, /navigation\.replace\('GroupCall'/);
  }
});

test('direct LiveKit token failures preserve the existing WebRTC rollback path', () => {
  for (const source of [nativeCall, webCall]) {
    assert.match(source, /LiveKit direct transport unavailable; retaining WebRTC fallback/);
    assert.match(source, /maybeStartOffer\(\)/);
    assert.match(source, /\/calls\/ice-config/);
  }
});

test('native direct LiveKit calls retain native call lifecycle and audio mute integration', () => {
  assert.match(nativeRoom, /nativeCallId/);
  assert.match(nativeRoom, /nativeRequestId/);
  assert.match(nativeRoom, /reportNativeOutgoingConnected/);
  assert.match(nativeRoom, /fulfillNativeIncomingConnected/);
  assert.match(nativeRoom, /zannychat:native-call-muted/);
  assert.match(nativeRoom, /heartbeat_call_session/);
});

test('native and web direct LiveKit calls retain call-session heartbeat and remote teardown', () => {
  for (const source of [nativeRoom, webRoom]) {
    assert.match(source, /directCallId/);
    assert.match(source, /heartbeat_call_session/);
    assert.match(source, /group_room_id/);
    assert.match(source, /navigation\.replace\('GroupCall'/);
    assert.match(source, /declined.*cancelled.*ended.*missed.*failed/);
  }
});

test('direct LiveKit calls can still promote to a multi-party room without leaving the original call active', () => {
  for (const source of [nativeRoom, webRoom]) {
    assert.match(source, /\/group-calls\/upgrade\/\$\{directCallId\}/);
    assert.match(source, /userIds: \[person\.id\]/);
    assert.match(source, /roomId: result\.room\.id/);
  }
});

test('direct call LiveKit rooms do not call group-only heartbeat or leave endpoints', () => {
  assert.match(nativeRoom, /roomId=\{directCallId \? null : connection\.roomId\}/);
  assert.match(nativeRoom, /!directCallId && !endingRef\.current/);
  assert.match(webRoom, /!directCallId && !endedRef\.current/);
  assert.match(nativeRoom, /preserveAudioSessionRef/);
});

test('native call header reads video mode from parent-owned connection state, not child-only track variables', () => {
  const header = nativeRoom.slice(nativeRoom.indexOf('<View style={styles.header}>'), nativeRoom.indexOf('</View>', nativeRoom.indexOf('<View style={styles.header}>')));
  assert.match(header, /connection\?\.callType \|\| callType/);
  assert.doesNotMatch(header, /\bisVideo\b|\btracks\b/);
});


test('late LiveKit token responses cannot resurrect a call after the user ends or leaves it', () => {
  for (const source of [nativeCall, webCall]) {
    const navigate = source.slice(source.indexOf('const navigateToDirectLiveKit'), source.indexOf('const endCall', source.indexOf('const navigateToDirectLiveKit')));
    assert.match(navigate, /!activeRef\.current \|\| endingRef\.current/);
    const end = source.slice(source.indexOf('const endCall'), source.indexOf('useEffect', source.indexOf('const endCall')));
    assert.match(end, /if \(endingRef\.current\) return/);
    assert.match(end, /endingRef\.current = true/);
  }
  const nativeEnd = nativeCall.slice(nativeCall.indexOf('const endCall'), nativeCall.indexOf('useEffect', nativeCall.indexOf('const endCall')));
  assert.match(nativeEnd, /if \(!endStatePersisted\) endingRef\.current = false/);
  const webEnd = webCall.slice(webCall.indexOf('const endCall'), webCall.indexOf('useEffect', webCall.indexOf('const endCall')));
  assert.doesNotMatch(webEnd, /if \(!endStatePersisted\) endingRef\.current = false/);
  assert.match(webEnd, /pcRef\.current\?\.close\(\)/);
  assert.match(webEnd, /navigation\.goBack\(\)/);
});


test('late token responses cannot fall through to WebRTC after a direct call has begun ending', () => {
  for (const source of [nativeCall, webCall]) {
    const start = source.indexOf('maybeStartOffer = async () => {', source.indexOf('const run = async'));
    const end = source.indexOf('};', start);
    const offerGuard = source.slice(start, end);
    assert.match(offerGuard, /endingRef\.current/);
    assert.match(source, /if \(!activeRef\.current \|\| endingRef\.current \|\| !next\) return/);
    assert.match(source, /if \(await navigateToDirectLiveKit\((?:liveCall|next), liveKitConnection\)\) return;\s*if \(!activeRef\.current \|\| endingRef\.current\) return;/);
  }
});


test('direct LiveKit transition revalidates the accepted call and handles concurrent conference promotion', () => {
  for (const source of [nativeCall, webCall]) {
    const start = source.indexOf('const navigateToDirectLiveKit');
    const end = source.indexOf('const endCall', start);
    const navigate = source.slice(start, end);
    assert.match(navigate, /from\('call_sessions'\)/);
    assert.match(navigate, /latestCall\.status !== 'accepted'/);
    assert.match(navigate, /latestCall\.group_room_id/);
    assert.match(navigate, /if \(!activeRef\.current \|\| endingRef\.current\) return false/);
    assert.ok(navigate.indexOf("if (latestCall.status !== 'accepted')") < navigate.indexOf("if (latestCall.group_room_id)"));
    assert.match(source, /if \(!stateError && \(!latestCall \|\| latestCall\.status !== 'accepted'\)\)/);
    assert.ok(source.indexOf("if (!stateError && (!latestCall || latestCall.status !== 'accepted'))") < source.indexOf("if (!stateError && latestCall.group_room_id)"));
    assert.match(source, /const \{ data: latestCall, error: stateError \} = await supabase\.from\('call_sessions'\)/);
  }
  assert.match(nativeCall, /if \(isTerminalCallStatus\(next\.status\)\) \{\s*endingRef\.current = true;/);
  assert.match(webCall, /else if \(isTerminalCallStatus\(next\.status\)\) \{\s*endingRef\.current = true;/);
});
