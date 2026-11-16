import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('saved-message bookmarks are stored and cleared under the owning account key only', async () => {
  const service = await readFile(new URL('../services/savedMessages.js', import.meta.url), 'utf8');
  assert.match(service, /const keyFor = \(userId\) => `zannychat\.savedMessages\.v1\.\$\{String\(userId \|\| 'guest'\)\}`/);
  assert.match(service, /export async function clearSavedMessagesForUser\(userId\)/);
  assert.match(service, /if \(!userId\) return false/);
  assert.match(service, /AsyncStorage\.removeItem\(keyFor\(userId\)\)/);
});

test('chat folders already expose account-scoped local cleanup and account deletion invokes it', async () => {
  const service = await readFile(new URL('../services/chatFolders.js', import.meta.url), 'utf8');
  const api = await readFile(new URL('../services/api.js', import.meta.url), 'utf8');
  assert.match(service, /const keyFor = \(userId\) => `zannychat\.chatFolders\.v1\.\$\{encodeURIComponent\(String\(userId \|\| 'guest'\)\)\}`/);
  assert.match(service, /export async function clearChatFoldersForUser\(userId\)/);
  assert.match(service, /AsyncStorage\.removeItem\(keyFor\(userId\)\)/);
  assert.match(api, /clearChatFoldersForUser\(userData\.user\.id\)/);
});
