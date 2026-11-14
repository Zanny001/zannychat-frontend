import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const notifications = fs.readFileSync(new URL('./notifications.js', import.meta.url), 'utf8');
const incoming = fs.readFileSync(new URL('../screens/IncomingCallScreen.js', import.meta.url), 'utf8');

test('Creator LIVE push taps open LIVE discovery and carry the stream notification context', () => {
  assert.ok(notifications.includes("data.type.startsWith('live_')"));
  assert.ok(notifications.includes("navigationRef.navigate('LiveHub', { liveNotification: data })"));
  assert.ok(notifications.includes("live:${liveType}:${liveStreamId || data.creatorId || data.followerId || 'hub'}"));
  const liveHub = fs.readFileSync(new URL('../screens/LiveHubScreen.js', import.meta.url), 'utf8');
  assert.ok(liveHub.includes("route?.params?.liveNotification"));
  assert.ok(liveHub.includes("['live_stream_started', 'live_invitation', 'live_guest_request'].includes(type)"));
  assert.ok(liveHub.includes("type === 'live_guest_decision' && notification.status === 'accepted'"));
  assert.ok(liveHub.includes("joinLive({ id: streamId })"));
});

test('incoming call notifications expose Answer and Decline actions', () => {
  assert.ok(notifications.includes("setNotificationCategoryAsync('incoming-call'"));
  assert.ok(notifications.includes("identifier: 'ANSWER_CALL'"));
  assert.ok(notifications.includes("identifier: 'DECLINE_CALL'"));
  assert.ok(notifications.includes("actionIdentifier === 'DECLINE_CALL'"));
  assert.ok(notifications.includes("autoAnswer: actionIdentifier === 'ANSWER_CALL'"));
});

test('Answer notification action accepts the call once after loading its screen', () => {
  assert.ok(incoming.includes('autoAnswer = false'));
  assert.ok(incoming.includes('autoAnswerHandledRef.current = true'));
  assert.ok(incoming.includes("updateCallStatus(call.id, 'accepted')"));
});
