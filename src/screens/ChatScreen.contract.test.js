import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./ChatScreen.js', import.meta.url), 'utf8');

test('chat picker enforces the same exact 25,000,000-byte limit as Storage', () => {
  assert.match(screen, /const MAX_FILE_SIZE = 25_000_000/);
});

test('permanent attachment type and size failures are not queued for transient retry', () => {
  assert.match(screen, /error\?\.code === 'UNSUPPORTED_MEDIA_TYPE' \|\| error\?\.code === 'FILE_TOO_LARGE'/);
  const start = screen.indexOf('async function queueAttachmentRetry');
  const end = screen.indexOf('\n  }', start) + 4;
  const body = screen.slice(start, end);
  assert.match(body, /UNSUPPORTED_MEDIA_TYPE/);
  assert.match(body, /FILE_TOO_LARGE/);
  assert.ok(body.indexOf('if (error?.code') < body.indexOf('preserveAttachmentForRetry'));
});

test('invalid files already in the retry queue are removed instead of retried forever', () => {
  assert.match(screen, /const removed = await removePendingAttachment\(myUserId, conversation\.id, item\.id\)/);
  assert.match(screen, /await removePreservedAttachment\(FileSystem, item\)/);
});
