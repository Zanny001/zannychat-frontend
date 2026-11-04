import test from 'node:test';
import assert from 'node:assert/strict';
import { getMessageOutboxStorageKey } from './messageOutboxKeys.js';

test('message outbox keys encode delimiters to prevent user/conversation collisions', () => {
  const first = getMessageOutboxStorageKey('user:alpha', 'room');
  const second = getMessageOutboxStorageKey('user', 'alpha:room');
  assert.notEqual(first, second);
  assert.match(first, /^zannychat:outbox:v1:/);
  assert.equal(getMessageOutboxStorageKey('user-1', 'room-1'), 'zannychat:outbox:v1:user-1:room-1');
});

test('message outbox key rejects a missing conversation and safely handles malformed Unicode IDs', () => {
  assert.equal(getMessageOutboxStorageKey('user-1', ''), null);
  assert.equal(getMessageOutboxStorageKey('user\uD800', 'room'), 'zannychat:outbox:v1:user%EF%BF%BD:room');
});
