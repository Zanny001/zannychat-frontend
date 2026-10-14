import test from 'node:test';
import assert from 'node:assert/strict';
import { createPinnedMessage, upsertPinnedMessage, removePinnedMessage, filterPinnedMessages, isMessagePinned } from './pinnedMessages.js';

test('pin payload keeps message identity and avoids private media URLs', () => {
  const item = createPinnedMessage({ id: 'm1', text: 'hello', mediaType: 'image', attachmentUrl: 'https://private.example/signed?token=secret', createdAt: '2026-01-01' }, { id: 'c1', name: 'Team' });
  assert.equal(item.id, 'c1:m1');
  assert.equal(item.conversationName, 'Team');
  assert.equal(item.attachment.type, 'image');
  assert.equal('attachmentUrl' in item, false);
  assert.equal(JSON.stringify(item).includes('token=secret'), false);
});

test('deleted or unidentified messages cannot be pinned', () => {
  assert.throws(() => createPinnedMessage({ id: 'm1', deletedAt: 'now' }, { id: 'c1' }));
  assert.throws(() => createPinnedMessage({ text: 'missing id' }, { id: 'c1' }));
});

test('upsert moves duplicate to top and bounds collection', () => {
  const one = { id: 'one', messageId: '1', conversationId: 'c' };
  const two = { id: 'two', messageId: '2', conversationId: 'c' };
  assert.deepEqual(upsertPinnedMessage([one, two], { ...one, text: 'updated' }).map((x) => x.id), ['one', 'two']);
  assert.equal(upsertPinnedMessage(Array.from({ length: 301 }, (_, i) => ({ id: String(i) })), { id: 'new' }).length, 300);
});

test('filter by conversation and text, and identify pins', () => {
  const items = [
    { id: 'c1:m1', messageId: 'm1', conversationId: 'c1', text: 'Alpha plans', conversationName: 'Work', pinnedAt: '2026-01-02' },
    { id: 'c2:m2', messageId: 'm2', conversationId: 'c2', text: 'Weekend', conversationName: 'Friends', pinnedAt: '2026-01-01' },
  ];
  assert.equal(filterPinnedMessages(items, 'alpha').length, 1);
  assert.equal(filterPinnedMessages(items, '', 'c2')[0].messageId, 'm2');
  assert.equal(isMessagePinned(items, 'c1', 'm1'), true);
  assert.equal(isMessagePinned(items, 'c2', 'm1'), false);
});

test('remove only the requested pin', () => {
  assert.deepEqual(removePinnedMessage([{ id: 'a' }, { id: 'b' }], 'a'), [{ id: 'b' }]);
});


test('pinned bookmark preserves safe conversation metadata for reopening the chat', () => {
  const item = createPinnedMessage(
    { id: 'm7', text: 'meet at six', mediaType: 'image', attachmentUrl: 'https://private.example/signed?token=do-not-store' },
    { id: 'group-7', isGroup: true, name: 'Weekend crew', participant: { id: 'peer-1', name: 'Mira', accessToken: 'secret' } },
  );
  assert.deepEqual(item.conversation, {
    id: 'group-7', isGroup: true, name: 'Weekend crew', participant: { id: 'peer-1', name: 'Mira' },
  });
  assert.equal(JSON.stringify(item).includes('do-not-store'), false);
  assert.equal(JSON.stringify(item).includes('accessToken'), false);
});
