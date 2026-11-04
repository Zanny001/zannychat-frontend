import test from 'node:test';
import assert from 'node:assert/strict';
import { getAttachmentOutboxStorageKey } from './attachmentOutboxKeys.js';

test('attachment outbox keys encode delimiters to prevent user/conversation collisions', () => {
  const first = getAttachmentOutboxStorageKey('user:alpha', 'room');
  const second = getAttachmentOutboxStorageKey('user', 'alpha:room');
  assert.notEqual(first, second);
  assert.match(first, /^zannychat:attachment-outbox:v1:/);
  assert.equal(getAttachmentOutboxStorageKey('user-1', 'room-1'), 'zannychat:attachment-outbox:v1:user-1:room-1');
});

test('attachment outbox keys reject missing conversations and normalize malformed Unicode', () => {
  assert.equal(getAttachmentOutboxStorageKey('user-1', ''), null);
  assert.equal(getAttachmentOutboxStorageKey('user\uD800', 'room'), 'zannychat:attachment-outbox:v1:user%EF%BF%BD:room');
});
