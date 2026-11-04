import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = await readFile(resolve(here, '../screens/ChatListScreen.js'), 'utf8');

test('chat list exposes a retryable error state when conversation loading fails', () => {
  assert.match(source, /setLoadError\(error\?\.message \|\| 'Could not load your chats/);
  assert.match(source, /accessibilityRole="alert"/);
  assert.match(source, /accessibilityLabel="Retry loading chats"/);
  assert.match(source, /onPress=\{\(\) => load\(\)\.catch\(\(\) => \{\}\)\}/);
});

test('chat list provides a useful search-empty state and clear-search action', () => {
  assert.match(source, /No matches found/);
  assert.match(source, /accessibilityLabel="Clear chat search"/);
  assert.match(source, /onPress=\{\(\) => setQuery\(''\)\}/);
});

test('first-run chat empty state offers a direct accessible new-chat action', () => {
  assert.match(source, /Your conversations start here/);
  assert.match(source, /accessibilityLabel="Start your first chat"/);
  assert.match(source, /navigation\.navigate\('NewChat'\)/);
});
