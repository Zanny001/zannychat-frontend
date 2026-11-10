import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const nativeBridge = fs.readFileSync(new URL('./nativeCallSystem.native.js', import.meta.url), 'utf8');
const webBridge = fs.readFileSync(new URL('./nativeCallSystem.web.js', import.meta.url), 'utf8');
const navigator = fs.readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');
const callScreen = fs.readFileSync(new URL('../screens/CallScreen.js', import.meta.url), 'utf8');

test('native call bridge gracefully falls back until a native binary includes CallKit/Telecom', () => {
  assert.ok(nativeBridge.includes("requireOptionalNativeModule('ExpoCallKitTelecom')"));
  assert.ok(nativeBridge.includes("require('expo-callkit-telecom')"));
  assert.ok(webBridge.includes('isNativeCallUiAvailable = false'));
});

test('native call lifecycle covers incoming, answer, end, mute and media-connected events', () => {
  for (const api of ['addCallSessionAddedListener', 'addCallAnsweredListener', 'addCallEndedListener', 'addSetMutedActionListener']) {
    assert.ok(nativeBridge.includes(api));
  }
  assert.ok(callScreen.includes('reportNativeOutgoingConnected(nativeCallId)'));
  assert.ok(callScreen.includes('fulfillNativeIncomingConnected(nativeRequestId)'));
  assert.ok(callScreen.includes('setRTCAudioSessionConfiguration'));
  assert.ok(navigator.includes('initializeNativeCallSystem'));
});

test('outgoing native end events resolve the backend call id from encrypted mapping records', () => {
  assert.ok(navigator.includes('nativeMapping?.serverCallId'));
  assert.ok(navigator.includes('getNativeCallMapping(id)'));
  assert.ok(navigator.includes('getCallSessionById(callId)'));
});

test('outgoing ringback tone plays for native Telecom and JS fallback sessions', () => {
  const outgoing = fs.readFileSync(new URL('../screens/OutgoingCallScreen.js', import.meta.url), 'utf8');
  assert.ok(outgoing.includes("startCallTone('outgoing')"));
  assert.ok(!outgoing.includes("if (!initialCall.nativeCallId) startCallTone('outgoing')"));
  assert.ok(outgoing.includes('stopCallTone();'));
});
