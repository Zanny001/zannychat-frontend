import test from 'node:test';
import assert from 'node:assert/strict';
import { createMessageCursor, validateMessageCursor } from './messagePagination.js';

const message = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  createdAtRaw: '2026-11-17T13:30:12.123456+00:00',
};

test('message cursor uses both timestamp and stable UUID tie-breaker', () => {
  assert.deepEqual(createMessageCursor(message), {
    id: message.id,
    created_at: message.createdAtRaw,
  });
  assert.deepEqual(validateMessageCursor(createMessageCursor(message)), {
    id: message.id,
    created_at: message.createdAtRaw,
  });
});

test('message cursor preserves PostgreSQL microsecond timestamp precision', () => {
  const cursor = validateMessageCursor(message);
  assert.equal(cursor.created_at, '2026-11-17T13:30:12.123456+00:00');
});

test('message cursor rejects malformed IDs and timestamps', () => {
  assert.equal(createMessageCursor({ ...message, id: 'invalid' }), null);
  assert.equal(createMessageCursor({ ...message, createdAtRaw: 'not-a-date' }), null);
  assert.throws(() => validateMessageCursor({ id: 'invalid', created_at: message.createdAtRaw }), /cursor is invalid/);
  assert.throws(() => validateMessageCursor({ id: message.id, created_at: 'not-a-date' }), /cursor is invalid/);
  assert.throws(() => validateMessageCursor('2026-11-17T13:30:12.123Z'), /cursor is invalid/);
});

test('message cursor accepts null for the first page', () => {
  assert.equal(validateMessageCursor(null), null);
});
