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
