import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('saved-message reads fail closed and never overwrite an unreadable collection', () => {
  const service = read('../services/savedMessages.js');
  assert.match(service, /throw new Error\('Your saved messages could not be read/);
  assert.match(service, /const existing = await loadSavedMessages\(userId\)/);
  assert.match(service, /const next = \(await loadSavedMessages\(userId\)\)/);
  assert.doesNotMatch(service, /catch \(_\) \{ return \[\]; \}/);
});

test('pinned-message reads fail closed before local mutation', () => {
  const service = read('../services/pinnedMessages.js');
  assert.match(service, /throw new Error\('Your pinned-message bookmarks could not be read/);
  assert.match(service, /const next = upsertPinnedMessage\(await loadLocal\(userId\), item\)/);
  assert.match(service, /const current = await loadLocal\(userId\)/);
  assert.match(service, /const next = removePinnedMessage\(current, pinId\)/);
  assert.doesNotMatch(service, /catch \(_\) \{ return \[\]; \}/);
});

test('saved and pinned message screens expose storage read failures with retry', () => {
  const saved = read('./SavedMessagesScreen.js');
  const pinned = read('./PinnedMessagesScreen.js');
  assert.match(saved, /Saved messages could not be loaded/);
  assert.match(saved, /Retry loading saved messages/);
  assert.match(pinned, /Pinned messages could not be loaded/);
  assert.match(pinned, /Retry loading pinned messages/);
});
