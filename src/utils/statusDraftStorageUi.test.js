import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('../screens/StatusUpdatesScreen.js', import.meta.url), 'utf8');

test('status composer restores local drafts for the signed-in account and persists edits after hydration', () => {
  assert.match(screen, /readStatusDraft\(AsyncStorage, userId\)/);
  assert.match(screen, /setStatusDraftReady\(true\)/);
  assert.match(screen, /writeStatusDraft\(AsyncStorage, myProfile\.id, \{ text, audience, expiryHours, selectedAudienceIds \}\)/);
  assert.match(screen, /Draft saved on this device/);
  assert.match(screen, /editable={statusComposerReady && !saving}/);
  assert.match(screen, /disabled={!statusComposerReady}/);
});

test('successful status publish clears only the signed-in account draft and draft media is not persisted', () => {
  assert.match(screen, /await clearStatusDraft\(AsyncStorage, myProfile\?\.id\)/);
  assert.match(screen, /selected media is not saved in drafts/);
});
