import test from 'node:test';
import assert from 'node:assert/strict';
import { preserveAttachmentForRetry, removePreservedAttachment } from './attachmentFileRecovery.js';

test('preserves a retry file in app-owned storage and avoids copying the original URI into metadata', async () => {
  const copies = [];
  const fs = {
    documentDirectory: 'file:///documents/',
    makeDirectoryAsync: async (...args) => copies.push(['mkdir', ...args]),
    copyAsync: async (args) => copies.push(['copy', args]),
  };
  const original = { id: 'att-1', kind: 'file', uri: 'file:///cache/report.pdf', name: 'report.pdf' };
  const result = await preserveAttachmentForRetry(fs, original, 'user/1', 'conversation 2');
  assert.equal(result.preserved, true);
  assert.equal(result.item.recoveryCopy, true);
  assert.match(result.item.uri, /zannychat-attachment-outbox\/user_1-conversation_2-att-1\.pdf$/);
  assert.equal(result.item.originalUri, undefined);
  assert.equal(copies.filter(([kind]) => kind === 'copy').length, 1);
});

test('falls back to original queue item when copying is unavailable or fails', async () => {
  const original = { id: 'att-2', uri: 'file:///cache/a.jpg' };
  assert.deepEqual(await preserveAttachmentForRetry({}, original, 'u', 'c'), { item: original, preserved: false });
  const result = await preserveAttachmentForRetry({ documentDirectory: 'file:///docs/', makeDirectoryAsync: async () => {}, copyAsync: async () => { throw new Error('no space'); } }, original, 'u', 'c');
  assert.deepEqual(result, { item: original, preserved: false });
});

test('deletes only app-preserved recovery copies', async () => {
  const deleted = [];
  const fs = { deleteAsync: async (...args) => deleted.push(args) };
  assert.equal(await removePreservedAttachment(fs, { uri: 'file:///cache/a.jpg' }), false);
  assert.equal(await removePreservedAttachment(fs, { uri: 'file:///docs/a.jpg', recoveryCopy: true }), true);
  assert.equal(deleted.length, 1);
});

test('chat retry path preserves failed uploads and cleans the recovery copy after queue removal', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../screens/ChatScreen.js', import.meta.url), 'utf8');
  assert.match(source, /preserveAttachmentForRetry\(FileSystem, item, myUserId, conversation\.id\)/);
  assert.match(source, /if \(!saved && recovery\.preserved\) await removePreservedAttachment\(FileSystem, queuedItem\)/);
  assert.match(source, /await removePreservedAttachment\(FileSystem, item\)/);
  assert.match(source, /expo-file-system\/legacy/);
});
