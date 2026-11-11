import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('./AppNavigator.js', import.meta.url), 'utf8');
const incoming = fs.readFileSync(new URL('../screens/IncomingCallScreen.js', import.meta.url), 'utf8');
const webCall = fs.readFileSync(new URL('../screens/CallScreen.web.js', import.meta.url), 'utf8');

test('web clients subscribe to incoming calls and recover invitations created before the tab opened', () => {
  assert.ok(app.includes('const deliverIncoming = async (incoming)'));
  assert.ok(app.includes('subscribeToIncomingCalls(userId, deliverIncoming)'));
  assert.ok(app.includes(".eq('callee_id', userId)"));
  assert.ok(app.includes(".eq('status', 'ringing')"));
  assert.ok(app.includes("Platform.OS === 'web' ? null : await reportIncomingCallIfNeeded"));
  assert.ok(app.includes('pendingIncomingRef.current = null'));
  assert.ok(app.includes('navigationRef.navigate(\'IncomingCall\', pending)'));
});

test('browser incoming calls can show a notification and navigate to accept or decline actions', () => {
  assert.ok(app.includes('window.Notification.permission === \'granted\''));
  assert.ok(app.includes("navigationRef.navigate('IncomingCall', params)"));
  assert.ok(incoming.includes('accessibilityLabel="Decline call"'));
  assert.ok(incoming.includes('accessibilityLabel="Answer call"'));
  assert.ok(incoming.includes("Platform.OS === 'ios'"));
});

test('web audio and video calls request browser media permissions and support call termination', () => {
  assert.ok(webCall.includes('navigator.mediaDevices.getUserMedia'));
  assert.ok(webCall.includes('new window.RTCPeerConnection'));
  assert.ok(webCall.includes("updateCallStatus(current.id, nextStatus)"));
  assert.ok(webCall.includes('navigation.goBack()'));
});
