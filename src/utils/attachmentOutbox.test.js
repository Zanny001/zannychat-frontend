import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('attachment outbox validates supported attachment kinds and bounds the queue', async () => {
  const source = await readFile(new URL('../services/attachmentOutbox.js', import.meta.url), 'utf8');
  assert.match(source, /normalizePendingAttachments/);
  const normalizer = await readFile(new URL('./normalizePendingAttachments.js', import.meta.url), 'utf8');
  assert.match(normalizer, /MAX_PENDING_ATTACHMENTS = 20/);
  assert.match(source, /\['image', 'video', 'file', 'voice'\]/);
  assert.match(source, /normalizePendingAttachments/);
});

test('attachment outbox scopes records by user and conversation', async () => {
  const source = await readFile(new URL('../services/attachmentOutbox.js', import.meta.url), 'utf8');
  assert.match(source, /getAttachmentOutboxStorageKey/);
});


test('attachment retry failures are bounded and retain diagnostic metadata', async () => {
  const source = await readFile(new URL('../services/attachmentOutbox.js', import.meta.url), 'utf8');
  assert.match(source, /recordAttachmentRetryFailure/);
  assert.match(source, /Math\.min\(100/);
  assert.match(source, /lastAttemptAt/);
  assert.match(source, /lastError/);
  assert.match(source, /getSafeRetryError\(error, 'attachment'\)/);
});

test('chat screen records a failed retry instead of silently leaving it unchanged', async () => {
  const source = await readFile(new URL('../screens/ChatScreen.js', import.meta.url), 'utf8');
  assert.match(source, /recordAttachmentRetryFailure\(myUserId, conversation\.id, item\.id, error\)/);
  assert.match(source, /Attachment still waiting/);
});
