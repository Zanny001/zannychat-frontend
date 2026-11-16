import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('permanent account deletion clears account-scoped local content before local sign-out', async () => {
  const source = await readFile(new URL('../services/api.js', import.meta.url), 'utf8');
  const deletionStart = source.indexOf('export async function deleteAccount');
  const deletion = source.slice(deletionStart);
  const serverDelete = deletion.indexOf("backendFetch('/account/delete'");
  const cleanup = deletion.indexOf('clearPendingMessagesForUser(userData.user.id)');
  const signOut = deletion.indexOf("supabase.auth.signOut({ scope: 'local' })");

  assert.ok(serverDelete >= 0, 'server account deletion request must exist');
  assert.ok(cleanup > serverDelete, 'local cleanup must not happen before server deletion succeeds');
  assert.ok(signOut > cleanup, 'local auth session is removed only after cleanup attempts');
  assert.match(deletion, /const localCleanupComplete = cleanupResults\.every\(Boolean\)/);
  assert.match(deletion, /return \{ deleted: true, localCleanupComplete \}/);
  for (const operation of [
    'clearDraftsForUser(userData.user.id)',
    'clearPinnedMessagesForUser(userData.user.id)',
    'clearPendingMessagesForUser(userData.user.id)',
    'clearPendingAttachmentsForUser(userData.user.id)',
    'clearStatusDraft(AsyncStorage, userData.user.id)',
    'clearChannelPostDraftsForUser(AsyncStorage, userData.user.id)',
  ]) assert.ok(deletion.includes(operation), `missing local cleanup: ${operation}`);
});

test('status screen loads, saves and clears drafts using the signed-in profile ID', async () => {
  const source = await readFile(new URL('../screens/StatusUpdatesScreen.js', import.meta.url), 'utf8');
  assert.match(source, /readStatusDraft\(AsyncStorage, userId\)/);
  assert.match(source, /writeStatusDraft\(AsyncStorage, myProfile\.id/);
  assert.match(source, /clearStatusDraft\(AsyncStorage, myProfile\?\.id\)/);
  assert.match(source, /\[myProfile\?\.id\]/);
});


test('account deletion warns when local cleanup could not complete', async () => {
  const source = await readFile(new URL('../screens/PrivacySecurityScreen.js', import.meta.url), 'utf8');
  assert.match(source, /deletionResult\?\.localCleanupComplete/);
  assert.match(source, /Clear ZannyChat app storage on this device/);
});
