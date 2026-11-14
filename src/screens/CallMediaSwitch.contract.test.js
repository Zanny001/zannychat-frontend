import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const native = fs.readFileSync(new URL('./CallScreen.js', import.meta.url), 'utf8');
const web = fs.readFileSync(new URL('./CallScreen.web.js', import.meta.url), 'utf8');
const nativeGroup = fs.readFileSync(new URL('./GroupCallScreen.js', import.meta.url), 'utf8');
const webGroup = fs.readFileSync(new URL('./GroupCallScreen.web.js', import.meta.url), 'utf8');
const creatorProfile = fs.readFileSync(new URL('./LiveCreatorProfileScreen.js', import.meta.url), 'utf8');
const navigator = fs.readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');
const hub = fs.readFileSync(new URL('./LiveHubScreen.js', import.meta.url), 'utf8');

test('native and web 1:1 calls can acquire and publish camera media after an audio call has connected', () => {
  for (const source of [native, web]) {
    assert.ok(source.includes('Switch to video'));
    assert.ok(source.includes('Switch to audio'));
    assert.ok(source.includes('cameraSwitchInProgressRef'));
    assert.ok(source.includes("pc.signalingState !== 'stable'"));
    assert.ok(source.includes('createOffer()'));
    assert.ok(source.includes('setLocalDescription(offer)'));
    assert.ok(source.includes("type: 'offer'"));
    assert.ok(source.includes('removeTrack('));
    assert.ok(source.includes("setLocalDescription({ type: 'rollback' })"));
  }
});

test('native and web remote video tracks activate and release the video stage', () => {
  assert.ok(native.includes('event.track.onunmute = refreshRemoteVideoState'));
  assert.ok(native.includes('event.track.onended = refreshRemoteVideoState'));
  assert.ok(web.includes('event.track.onunmute'));
  const webVideoStart = web.indexOf("if (event.track?.kind === 'video')");
  const webVideoEnd = web.indexOf('else if (event.track)', webVideoStart);
  assert.ok(web.slice(webVideoStart, webVideoEnd).includes('remoteStreamRef.current.addTrack(event.track)'));
  assert.ok(web.includes("const immersiveVideo = activeCallType === 'video' || remoteVideoActive"));
});

test('native and web 1:1 call signaling validates the remote participant and accepts renegotiation', () => {
  for (const source of [native, web]) {
    assert.match(source, /expectedRemoteId = isCaller \? callRef\.current\?\.callee_id : callRef\.current\?\.caller_id/);
    assert.match(source, /if \(signal\.signal_type === 'offer'\)/);
    assert.match(source, /signal\.signal_type === 'answer' && pc\.signalingState === 'have-local-offer'/);
    assert.match(source, /setLocalDescription\(\{ type: 'rollback' \}\)/);
  }
});

test('upgrading an active call passes the current media mode to the conference backend', () => {
  assert.ok(native.includes('callType: activeCallType'));
  assert.ok(web.includes('callType: activeCallType'));
});

test('native and web group calls expose camera controls during audio calls', () => {
  assert.match(nativeGroup, /onPress=\{toggleCamera\}/);
  assert.match(webGroup, /onPress=\{toggleCamera\}/);
  assert.match(nativeGroup, /setCameraEnabled\(cameraOff\)/);
  assert.match(webGroup, /setCameraEnabled\(!next\)/);
});

test('LIVE creator profile is a separate authenticated dashboard, not the main profile screen', () => {
  assert.match(creatorProfile, /\/live\/creators\/me\/profile/);
  assert.match(creatorProfile, /Creator profile/);
  assert.match(creatorProfile, /Creator impact/);
  assert.match(creatorProfile, /Replay collection/);
  assert.match(navigator, /name="LiveCreatorProfile" component=\{LiveCreatorProfileScreen\}/);
  assert.match(hub, /navigation\.navigate\('LiveCreatorProfile'\)/);
  assert.doesNotMatch(creatorProfile, /import\s+ProfileScreen/);
});
