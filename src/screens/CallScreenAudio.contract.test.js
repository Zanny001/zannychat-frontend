import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const nativeScreen = fs.readFileSync(new URL('./CallScreen.js', import.meta.url), 'utf8');
const webScreen = fs.readFileSync(new URL('./CallScreen.web.js', import.meta.url), 'utf8');
const nativeBridge = fs.readFileSync(new URL('../services/nativeCallSystem.native.js', import.meta.url), 'utf8');
const webBridge = fs.readFileSync(new URL('../services/nativeCallSystem.web.js', import.meta.url), 'utf8');

test('native call screen declares a stable speaker state for every render', () => {
  assert.match(nativeScreen, /const \\[speakerOn, setSpeakerOn\\] = useState\\(\\(initialCall\\?\\.call_type \\|\\| callType\\) === 'video'\\)/);
  assert.match(nativeScreen, /setAudioSessionPortOverride\(next\)/);
  assert.match(nativeScreen, /AudioSession\.selectAudioOutput\(next \? 'force_speaker' : 'default'\)/);
});

test('native fallback calls explicitly prepare and release the media audio session', () => {
  assert.match(nativeScreen, /if \(!nativeCallId && !nativeRequestId\)/);
  assert.match(nativeScreen, /prepareAudioSessionForCall\(callTypeRef\.current === 'video'\)/);
  assert.match(nativeScreen, /await AudioSession\.startAudioSession\(\)/);
  assert.match(nativeScreen, /releaseCallAudioSession\(\)/);
  assert.match(nativeBridge, /api\.prepareAudioSessionForCall\(Boolean\(hasVideo\)\)/);
  assert.match(nativeBridge, /api\.restoreAudioSession\(\)/);
  assert.match(webBridge, /prepareAudioSessionForCall = \(\) => false/);
});

test('native WebRTC receives streamless remote tracks instead of silently dropping them', () => {
  assert.match(nativeScreen, /new MediaStream\(\)/);
  assert.match(nativeScreen, /remoteRef\.current\.addTrack\(event\.track\)/);
});

test('web audio calls attach remote tracks to an autoplay audio element', () => {
  assert.match(webScreen, /React\.createElement\('audio'/);
  assert.match(webScreen, /ref: remoteAudioRef, autoPlay: true/);
  assert.match(webScreen, /element\.srcObject = remoteStream/);
  assert.match(webScreen, /await element\.play\?\.\(\)/);
});

test('web call exposes a user-gesture recovery action when browser autoplay is blocked', () => {
  assert.match(webScreen, /audioPlaybackBlocked/);
  assert.match(webScreen, /accessibilityLabel="Enable call audio"/);
  assert.match(webScreen, /Tap to hear audio/);
});

test('web WebRTC preserves streamless remote audio and video tracks', () => {
  assert.match(webScreen, /new window\.MediaStream\(\)/);
  assert.match(webScreen, /remoteStreamRef\.current\.addTrack\(event\.track\)/);
});
