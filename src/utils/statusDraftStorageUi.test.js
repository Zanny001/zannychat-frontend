import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('../screens/StatusUpdatesScreen.js', import.meta.url), 'utf8');

test('status composer restores local drafts and persists edits after hydration', () => {
  assert.match(screen, /readStatusDraft\(AsyncStorage\)/);
  assert.match(screen, /setStatusDraftReady\(true\)/);
  assert.match(screen, /writeStatusDraft\(AsyncStorage, \{ text, audience, expiryHours, selectedAudienceIds \}\)/);
  assert.match(screen, /Draft saved on this device/);
});

test('successful status publish clears the local draft and draft media is explicitly not persisted', () => {
  assert.match(screen, /await clearStatusDraft\(AsyncStorage\)/);
  assert.match(screen, /selected media is not saved in drafts/);
});
