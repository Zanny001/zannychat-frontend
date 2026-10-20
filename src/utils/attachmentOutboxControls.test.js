import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('chat attachment queue exposes a per-item discard action with confirmation', async () => {
  const source = await readFile(new URL('../screens/ChatScreen.js', import.meta.url), 'utf8');
  assert.match(source, /function discardPendingAttachment\(item\)/);
  assert.match(source, /Alert\.alert\('Remove queued attachment\?'/);
  assert.match(source, /await removePendingAttachment\(myUserId, conversation\.id, item\.id\)/);
  assert.match(source, /await removePreservedAttachment\(FileSystem, item\)/);
  assert.match(source, /setPendingAttachments\(\(items\) => items\.filter\(\(entry\) => entry\.id !== item\.id\)\)/);
});

test('attachment queue shows per-item error and recovery information', async () => {
  const source = await readFile(new URL('../screens/ChatScreen.js', import.meta.url), 'utf8');
  assert.match(source, /Last error: \$\{item\.lastError\}/);
  assert.match(source, /Recovery copy saved on this device/);
  assert.match(source, /Retry eligible uploads/);
});


test('attachment queue exposes individual retry controls and respects retry backoff', async () => {
  const source = await readFile(new URL('../screens/ChatScreen.js', import.meta.url), 'utf8');
  assert.match(source, /async function retryPendingAttachments\(attachmentId = null\)/);
  assert.match(source, /pendingAttachments\.filter\(\(item\) => item\.id === attachmentId\)/);
  assert.match(source, /onPress=\{\(\) => retryPendingAttachments\(item\.id\)\}/);
  assert.match(source, /isAttachmentRetryDue\(item\)/);
  assert.match(source, /This attachment is still in its retry waiting period/);
});
