import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Chat Folders clears a stale load error before retrying and reports delete failures', async () => {
  const source = await readFile(new URL('../screens/ChatFoldersScreen.js', import.meta.url), 'utf8');
  assert.match(source, /const refresh = useCallback\(async \(\) => \{\s*setLoading\(true\);\s*setError\(''\);/);
  assert.match(source, /try \{\s*const next = await deleteChatFolder\(userId, folder\.id\);\s*setFolders\(next\);\s*\} catch \(_\) \{\s*setError\('Could not delete this folder\. Please try again\.'\);/);
});

test('Saved Messages clears stale error state when refreshing', async () => {
  const source = await readFile(new URL('../screens/SavedMessagesScreen.js', import.meta.url), 'utf8');
  assert.match(source, /const refresh = useCallback\(async \(\) => \{\s*setLoading\(true\);\s*setError\(''\);/);
});
