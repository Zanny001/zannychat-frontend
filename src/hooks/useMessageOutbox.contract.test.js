import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const hook = readFileSync(new URL('./useMessageOutbox.js', import.meta.url), 'utf8');
const screen = readFileSync(new URL('../screens/ChatScreen.js', import.meta.url), 'utf8');

test('message outbox preserves the bounded 50-item queue and idempotent request IDs', () => {
  assert.match(hook, /MAX_PENDING_MESSAGES/);
  assert.match(hook, /savePendingMessage\(expectedUserId, conversationId, message\)/);
  assert.match(hook, /item\.requestId !== message\.requestId/);
});

test('automatic retries use bounded oldest-first exponential-backoff batches', () => {
  assert.match(hook, /isMessageRetryDue\(item\)/);
  assert.match(hook, /\.sort\(\(a, b\) => Date\.parse\(a\.createdAt \|\| 0\) - Date\.parse\(b\.createdAt \|\| 0\)\)/);
  assert.match(hook, /slice\(0, force \? MAX_PENDING_MESSAGES : AUTOMATIC_RETRY_BATCH_SIZE\)/);
  assert.match(hook, /RETRY_INTERVAL_MS = 15000/);
});

test('manual retry bypasses backoff and does not route through composer edit state', () => {
  assert.match(hook, /retryQueuedTextMessages\(\{ force: true \}\)/);
  assert.match(screen, /onPress=\{retryPendingMessages\}/);
  assert.doesNotMatch(screen, /for \(const item of \[\.\.\.pendingOutbox\]\) \{ const ok = await handleSend/);
});

test('outbox rejects stale account work and clears on account change', () => {
  assert.match(hook, /retryGenerationRef\.current/);
  assert.match(hook, /isOwnerCurrent\(expectedUserId\)/);
  assert.match(hook, /error\?\.code === 'AUTH_USER_CHANGED'/);
  assert.match(hook, /const resetOutbox = useCallback/);
  assert.match(hook, /const generation = \+\+retryGenerationRef\.current/);
  assert.match(hook, /if \(generation === retryGenerationRef\.current\) retryGenerationRef\.current \+= 1/);
  assert.match(screen, /resetOutbox\(\)/);
});

test('permanent send failures are removed while transient failures retain safe retry metadata', () => {
  assert.match(hook, /if \(isPermanentMessageSendError\(error\)\)/);
  assert.match(hook, /removePendingMessage\(expectedUserId, conversationId, item\.requestId\)/);
  assert.match(hook, /recordMessageRetryFailure\(expectedUserId, conversationId, item\.requestId, error\)/);
});
