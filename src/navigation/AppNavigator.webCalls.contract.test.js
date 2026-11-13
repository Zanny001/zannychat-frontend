import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('./AppNavigator.js', import.meta.url), 'utf8');
const incoming = fs.readFileSync(new URL('../screens/IncomingCallScreen.js', import.meta.url), 'utf8');
const webCall = fs.readFileSync(new URL('../screens/CallScreen.web.js', import.meta.url), 'utf8');

test('incoming-call delivery subscribes before recovering still-ringing invitations', () => {
  const subscribeAt = app.indexOf('subscribeToIncomingCalls(userId, deliverIncoming)');
  const queryAt = app.indexOf("supabase.from('call_sessions')", subscribeAt);
  assert.ok(subscribeAt >= 0);
  assert.ok(queryAt > subscribeAt);
  assert.ok(app.includes(".eq('callee_id', userId)"));
  assert.ok(app.includes(".eq('status', 'ringing')"));
  assert.ok(app.includes(".gt('expires_at', new Date().toISOString())"));
  assert.ok(app.includes('.limit(5)'));
});

test('incoming-call events are deduplicated before asynchronous work and retry after failures', () => {
  const claimAt = app.indexOf('incomingIdsRef.current.add(incoming.id)');
  const awaitAt = app.indexOf('const callerName = await getCallParticipantName(incoming.caller_id)', claimAt);
  assert.ok(claimAt >= 0);
  assert.ok(awaitAt > claimAt);
  assert.ok(app.includes('incomingIdsRef.current.delete(incoming.id)'));
  assert.ok(app.includes('pendingIncomingRef.current = params'));
});

test('browser notifications remain optional and route users to the in-app answer controls', () => {
  assert.ok(app.includes("Notification.permission === 'granted'"));
  assert.ok(app.includes("navigationRef.navigate('IncomingCall', params)"));
  assert.ok(incoming.includes('accessibilityLabel="Answer call"'));
  assert.ok(incoming.includes('accessibilityLabel="Decline call"'));
});

test('web audio/video calling requests browser media and creates a peer connection', () => {
  assert.ok(webCall.includes('navigator.mediaDevices.getUserMedia'));
  assert.ok(webCall.includes('new window.RTCPeerConnection'));
  assert.ok(webCall.includes('updateCallStatus(current.id, nextStatus)'));
});

test('late invitations from a previous signed-in account are ignored after account switches', () => {
  assert.ok(app.includes('let activeUserId = null'));
  assert.ok(app.includes('incoming.callee_id !== activeUserId'));
  assert.ok(app.includes('activeUserId = userId'));
});
