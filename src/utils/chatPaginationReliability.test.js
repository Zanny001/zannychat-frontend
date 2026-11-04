import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = await readFile(resolve(here, '../screens/ChatListScreen.js'), 'utf8');

test('chat pagination exposes an accessible retry when loading an older page fails', () => {
  assert.match(source, /setLoadMoreError\(err\?\.message \|\| 'Could not load older chats/);
  assert.match(source, /accessibilityLabel="Retry loading older chats"/);
  assert.match(source, /onPress=\{handleLoadMore\}/);
  assert.match(source, /setLoadMoreError\(''\)/);
});

test('chat pagination rejects malformed pages without losing the retry path', () => {
  assert.match(source, /if \(!Array\.isArray\(older\)\) throw new Error\('The server returned an invalid chat page\.'\)/);
  assert.match(source, /setHasMore\(Boolean\(more\)\)/);
});

test('chat pagination deduplicates overlapping pages and ignores malformed rows', () => {
  assert.match(source, /if \(item && item\.id != null && !seen\.has\(item\.id\)\)/);
  assert.match(source, /seen\.add\(item\.id\)/);
});
