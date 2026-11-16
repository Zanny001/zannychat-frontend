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
  assert.match(inputBar, /backgroundColor: colors\.surfaceElevated/);
  assert.match(inputBar, /borderColor: hexToRgba\(colors\.primary, 0\.32\)/);
  assert.match(inputBar, /borderRadius: 20/);
  assert.match(inputBar, /minHeight: 52/);
  assert.match(inputBar, /width: 48, height: 48/);
  assert.match(inputBar, /accessibilityLabel="Send voice message"/);
  assert.match(inputBar, /accessibilityLabel=\{text\.trim\(\) \? \(editing \? 'Confirm edit' : 'Send message'\) : 'Record a voice message'\}/);
  assert.ok((inputBar.match(/hitSlop=\{6\}/g) || []).length >= 3, 'recording send, text send, and emoji controls retain their intended hit slop');
  assert.match(inputBar, /maxHeight: 96/); // keep multiline composer growth bounded
  assert.match(inputBar, /textAlignVertical: 'center'/);
});


test('initial message history failures render an accessible retry instead of a blank chat', () => {
  assert.match(screen, /const \[loadingMessages, setLoadingMessages\] = useState\(true\)/);
  assert.match(screen, /const \[messageLoadError, setMessageLoadError\] = useState\(''\)/);
  assert.match(screen, /setMessageLoadError\(error\?\.message \|\| 'Could not load messages/);
  assert.match(screen, /ListEmptyComponent=\{/);
  assert.match(screen, /accessibilityLabel="Retry loading messages"/);
  assert.match(screen, /No messages yet\. Say hello to start the conversation\./);
});

test('older history pagination failures retain a visible accessible retry action', () => {
  assert.match(screen, /const \[olderLoadError, setOlderLoadError\] = useState\(''\)/);
  assert.match(screen, /setOlderLoadError\(err\?\.message \|\| 'Could not load earlier messages/);
  assert.match(screen, /accessibilityLabel="Retry loading earlier messages"/);
  assert.match(screen, /hasMore && !olderLoadError/);
});
