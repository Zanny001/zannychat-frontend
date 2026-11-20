import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('attachment outbox fails closed when persisted queue data cannot be read', () => {
  const service = read('./attachmentOutbox.js');
  assert.match(service, /throw new Error\('Your pending attachment uploads could not be read/);
  assert.match(service, /if \(!Array\.isArray\(parsed\)\) throw new Error/);
  assert.match(service, /const current = await loadPendingAttachments\(userId, conversationId\)/);
  assert.doesNotMatch(service, /catch \(_\) \{ return \[\]; \}/);
});

test('message outbox fails closed when persisted queue data cannot be read', () => {
  const service = read('./messageOutbox.js');
  assert.match(service, /throw new Error\('Your pending messages could not be read/);
  assert.match(service, /if \(!Array\.isArray\(parsed\)\) throw new Error/);
  assert.match(service, /async function readQueue\(key\)/);
  assert.doesNotMatch(service, /catch \(_\) \{ return \[\]; \}/);
});

test('message outbox hook exposes read failures and a non-destructive reload action', () => {
  const hook = read('../hooks/useMessageOutbox.js');
  assert.match(hook, /const \[outboxLoadError, setOutboxLoadError\] = useState\(''\)/);
  assert.match(hook, /setOutboxLoadError\(error\?\.message/);
  assert.match(hook, /const reloadOutbox = useCallback/);
  assert.match(hook, /outboxLoadError,/);
  assert.match(hook, /reloadOutbox,/);
});

test('chat screen displays accessible recovery actions for both local retry queues', () => {
  const screen = read('../screens/ChatScreen.js');
  assert.match(screen, /pendingAttachmentsError/);
  assert.match(screen, /Retry loading pending attachments/);
  assert.match(screen, /outboxLoadError/);
  assert.match(screen, /Retry loading pending messages/);
  assert.match(screen, /accessibilityRole="alert"/);
});

test('failed attachment queue writes keep the preserved recovery copy', () => {
  const screen = read('../screens/ChatScreen.js');
  const start = screen.indexOf('async function queueAttachmentRetry');
  const end = screen.indexOf('\n  }', start) + 4;
  const body = screen.slice(start, end);
  assert.match(body, /Keep the recovery copy and the in-memory retry item/);
  assert.doesNotMatch(body, /if \(!saved && recovery\.preserved\) await removePreservedAttachment/);
  assert.match(body, /setPendingAttachments\(\(items\) => \[\.\.\.items\.filter/);
});
