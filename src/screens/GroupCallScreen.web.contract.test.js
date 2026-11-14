import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./GroupCallScreen.web.js', import.meta.url), 'utf8');

test('web group calls use the LiveKit JS media engine and publish local microphone/camera', () => {
  assert.match(source, /initialConnection\?\.room\?\.id/);
  assert.match(source, /from 'livekit-client'/);
  assert.match(source, /new Room\(/);
  assert.match(source, /backendFetch\('\/group-calls'/);
  assert.match(source, /joinedRoomIdRef/);
  assert.match(source, /room\.connect\(result\.livekitUrl, result\.token\)/);
  assert.match(source, /setMicrophoneEnabled\(true\)/);
  assert.match(source, /setCameraEnabled\(true\)/);
});

test('web group calls attach remote audio and video tracks and recover blocked playback', () => {
  assert.match(source, /RoomEvent\.TrackSubscribed/);
  assert.match(source, /track\.attach\(\)/);
  assert.match(source, /remoteAudioRef/);
  assert.match(source, /RoomEvent\.AudioPlaybackStatusChanged/);
  assert.match(source, /roomRef\.current\?\.startAudio\(\)/);
  assert.match(source, /MediaTile/);
});

test('web group calls support inviting, mute, camera, and end/leave actions', () => {
  assert.match(source, /group-call.*invite/);
  assert.match(source, /CallInvitePicker/);
  assert.match(source, /setMicrophoneEnabled\(!next\)/);
  assert.match(source, /setCameraEnabled\(!next\)/);
  assert.match(source, /canEnd \? 'end' : 'leave'/);
});
