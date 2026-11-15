import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./ChatScreen.js', import.meta.url), 'utf8');

test('chat picker enforces the same exact 25 MiB limit as Storage', () => {
  assert.match(screen, /const MAX_FILE_SIZE = 25 \* 1024 \* 1024/);
});

test('permanent attachment type, size, and authorization failures are not queued for transient retry', () => {
  assert.match(screen, /function isPermanentAttachmentUploadError/);
  assert.match(screen, /\[400, 403, 404, 413, 415, 422\]/);
  assert.match(screen, /getPermanentAttachmentErrorMessage/);
  const start = screen.indexOf('async function queueAttachmentRetry');
  const end = screen.indexOf('\n  }', start) + 4;
  const body = screen.slice(start, end);
  assert.match(body, /isPermanentAttachmentUploadError\(error\)/);
  assert.ok(body.indexOf('if (isPermanentAttachmentUploadError') < body.indexOf('preserveAttachmentForRetry'));
});

test('permanent attachment errors show actionable type, size, or permission guidance', () => {
  assert.match(screen, /This file type cannot be shared securely/);
  assert.match(screen, /This attachment exceeds the 25 MiB upload limit/);
  assert.match(screen, /You no longer have permission to upload attachments/);
});

test('invalid files already in the retry queue are removed instead of retried forever', () => {
  assert.match(screen, /const removed = await removePendingAttachment\(myUserId, conversation\.id, item\.id\)/);
  assert.match(screen, /await removePreservedAttachment\(FileSystem, item\)/);
});


test('deleted-message tombstones can be removed by either participant', () => {
  const deleteIndex = screen.indexOf("key: 'delete'");
  const deleteAction = screen.slice(deleteIndex - 120, deleteIndex + 550);
  assert.ok(deleteIndex >= 0, 'message action menu must expose deletion');
  assert.match(deleteAction, /label: sheetMessage\.deletedAt \? 'Remove deleted message' : isMineMessage\(sheetMessage\) \? 'Delete' : 'Delete for me'/);
  assert.doesNotMatch(deleteAction, /\.\.\.\(isMineMessage\(sheetMessage\)\s*\?/);
  assert.match(screen, /performDeleteMessage\(deleteMessageTarget, 'me'\)/);
});

test('message composer keeps a distinct moderate input surface and balanced control sizing', () => {
  const inputBar = fs.readFileSync(new URL('../components/InputBar.js', import.meta.url), 'utf8');
  assert.match(inputBar, /backgroundColor: hexToRgba\(colors\.surfaceElevated, 0\.78\)/);
  assert.match(inputBar, /borderColor: hexToRgba\(colors\.primary, 0\.24\)/);
  assert.match(inputBar, /minHeight: 44/);
  assert.match(inputBar, /width: 42, height: 42/);
  assert.match(inputBar, /maxHeight: 96/);
  assert.match(inputBar, /textAlignVertical: 'center'/);
});
