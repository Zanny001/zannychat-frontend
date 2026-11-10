import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const notifications = fs.readFileSync(new URL('./notifications.js', import.meta.url), 'utf8');
const incoming = fs.readFileSync(new URL('../screens/IncomingCallScreen.js', import.meta.url), 'utf8');

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
