import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const hook = readFileSync(new URL('./useChatTimeline.js', import.meta.url), 'utf8');
const screen = readFileSync(new URL('../screens/ChatScreen.js', import.meta.url), 'utf8');

test('chat timeline hook owns initial history and cursor pagination', () => {
  assert.match(hook, /fetchMessages\(conversationId, \{ limit: MESSAGE_PAGE_SIZE \}\)/);
  assert.match(hook, /before: \{ id: oldest\?\.id, created_at: oldest\?\.createdAtRaw \}/);
  assert.match(hook, /const seen = new Set\(prev\.map/);
  assert.match(hook, /older\.filter\(\(message\) => !seen\.has\(message\.id\)\)/);
});

test('chat timeline rejects stale account and request responses', () => {
  assert.match(hook, /requestId !== messageLoadRequestRef\.current/);
  assert.match(hook, /requestId !== olderLoadRequestRef\.current/);
  assert.match(hook, /activeUserIdRef\.current !== myUserId/);
  assert.match(hook, /resetTimeline/);
  assert.match(screen, /resetTimeline\('Your account changed/);
});

test('chat timeline subscriptions clean up and preserve read, delivery, reaction and typing state', () => {
  for (const service of ['subscribeToMessages', 'subscribeToReactions', 'subscribeToTyping', 'subscribePresence', 'subscribeToParticipantUpdates', 'subscribeToMessageDeliveryReceipts']) {
    assert.ok(hook.includes(service), service + ' subscription must remain owned by the hook');
  }
  assert.match(hook, /return unsubscribe/);
  assert.match(hook, /clearTimeout\(typingTimeoutRef\.current\)/);
  assert.match(hook, /markConversationRead\(conversationId\)/);
  assert.match(hook, /markMessagesDelivered\(conversationId/);
});

test('ChatScreen delegates timeline lifecycle while retaining message mutations', () => {
  assert.match(screen, /useChatTimeline\(/);
  assert.match(screen, /setMessages\(/);
  assert.match(screen, /setReactions\(/);
  assert.match(screen, /messageDeliveryState/);
  assert.doesNotMatch(screen, /const load = useCallback\(async \(\) =>/);
  assert.doesNotMatch(screen, /subscribeToMessages\(/);
});
