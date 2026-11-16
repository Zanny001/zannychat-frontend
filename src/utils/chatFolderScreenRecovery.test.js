import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Chat Folders clears a stale load error before retrying and reports delete failures', async () => {
  const source = await readFile(new URL('../screens/ChatFoldersScreen.js', import.meta.url), 'utf8');
  const refresh = source.slice(source.indexOf('const refresh ='), source.indexOf('useFocusEffect'));
  assert.match(refresh, /setLoading\(true\)[\s\S]*setError\(''\)/);
  assert.match(source, /try \{[\s\S]*deleteChatFolder\(userId, folder\.id\)[\s\S]*catch \(_\)[\s\S]*Could not delete this folder/);
});

test('Saved Messages keeps retry recovery and clears stale error state', async () => {
  const source = await readFile(new URL('../screens/SavedMessagesScreen.js', import.meta.url), 'utf8');
  const refresh = source.slice(source.indexOf('const refresh ='), source.indexOf('useFocusEffect'));
  assert.match(refresh, /setLoading\(true\)[\s\S]*setError\(''\)/);
  assert.match(source, /Could not remove bookmark/);
});
