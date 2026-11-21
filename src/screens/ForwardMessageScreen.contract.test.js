import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Forward Message exposes a recoverable load error and actionable empty state', () => {
  const source = readFileSync(new URL('./ForwardMessageScreen.js', import.meta.url), 'utf8');
  assert.match(source, /const \[loadFailed, setLoadFailed\]/);
  assert.match(source, /const \[retryCount, setRetryCount\]/);
  assert.match(source, /loadFailed \? \(/);
  assert.match(source, /accessibilityLabel="Retry loading chats"/);
  assert.match(source, /setRetryCount\(\(count\) => count \+ 1\)/);
  assert.match(source, /ListEmptyComponent=\{\(/);
  assert.match(source, /navigation\.navigate\('NewChat'\)/);
  assert.match(source, /accessibilityLabel="Start a new chat to forward this message"/);
  assert.match(source, /maxWidth: layout\.contentMaxWidth/);
});
