import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PENDING_MESSAGES, MAX_PENDING_MESSAGE_TEXT_LENGTH, normalizePendingMessages } from './normalizePendingMessages.js';

test('rejects malformed persisted outbox entries and normalizes retry metadata', () => {
  const result = normalizePendingMessages([
    null,
    { requestId: 'missing-text' },
    { requestId: 'x'.repeat(129), text: 'bad id' },
    { requestId: ' good-id ', text: ' hello ', attempts: 999, lastError: 'e'.repeat(300), replyToId: 'r'.repeat(129) },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].requestId, 'good-id');
  assert.equal(result[0].text, 'hello');
  assert.equal(result[0].attempts, 100);
  assert.match(result[0].lastError, /still waiting to send/);
  assert.equal(result[0].replyToId, null);
});

test('bounds message text and preserves the oldest pending queue entries', () => {
  const queue = Array.from({ length: MAX_PENDING_MESSAGES + 5 }, (_, i) => ({ requestId: `id-${i}`, text: 'x'.repeat(MAX_PENDING_MESSAGE_TEXT_LENGTH + 5) }));
  const result = normalizePendingMessages(queue);
  assert.equal(result.length, MAX_PENDING_MESSAGES);
  assert.equal(result[0].requestId, 'id-0');
  assert.equal(result.at(-1).requestId, `id-${MAX_PENDING_MESSAGES - 1}`);
  assert.equal(result[0].text.length, MAX_PENDING_MESSAGE_TEXT_LENGTH);
});

test('returns an empty queue for non-array storage values', () => {
  assert.deepEqual(normalizePendingMessages({ requestId: 'id', text: 'hello' }), []);
});

test('deduplicates persisted outbox entries by request ID and keeps the latest valid version', () => {
  const result = normalizePendingMessages([
    { requestId: 'send-1', text: 'first draft', attempts: 1 },
    { requestId: 'send-2', text: 'another message' },
    { requestId: ' send-1 ', text: 'corrected draft', attempts: 3, lastError: 'retrying' },
  ]);
  assert.deepEqual(result.map((item) => item.requestId), ['send-2', 'send-1']);
  assert.equal(result.length, 2);
  assert.equal(result[1].text, 'corrected draft');
  assert.equal(result[1].attempts, 3);
  assert.match(result[1].lastError, /still waiting to send/);
});

test('invalid duplicate entries do not erase a prior valid queued message', () => {
  const result = normalizePendingMessages([
    { requestId: 'send-1', text: 'valid queued text' },
    { requestId: 'send-1', text: '   ' },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].text, 'valid queued text');
});


test('canonicalizes queue timestamps and recovers malformed retry dates', () => {
  const result = normalizePendingMessages([
    { requestId: 'valid-date', text: 'hello', createdAt: '2026-10-23T10:00:00+01:00', lastAttemptAt: '2026-10-23T09:00:00Z' },
    { requestId: 'bad-dates', text: 'retry me', createdAt: 'not-a-date', lastAttemptAt: 'also-not-a-date' },
    { requestId: 'missing-date', text: 'old record', createdAt: 12345, lastAttemptAt: 'x'.repeat(65) },
  ]);
  assert.equal(result[0].createdAt, '2026-10-23T09:00:00.000Z');
  assert.equal(result[0].lastAttemptAt, '2026-10-23T09:00:00.000Z');
  assert.equal(result[1].createdAt, new Date(0).toISOString());
  assert.equal(result[1].lastAttemptAt, null);
  assert.equal(result[2].createdAt, new Date(0).toISOString());
  assert.equal(result[2].lastAttemptAt, null);
});
