import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./PinnedMessagesScreen.js', import.meta.url), 'utf8');

test('pinned message load failures are distinct from a genuine empty collection', () => {
  assert.ok(screen.includes(' : error ? ('));
  assert.match(screen, /Retry loading pinned messages/);
  assert.match(screen, /ListEmptyComponent=/);
  assert.match(screen, /No pinned messages yet/);
});

test('pinned message search and open/unpin actions have accessible labels and mobile targets', () => {
  assert.match(screen, /accessibilityLabel="Search pinned messages"/);
  assert.match(screen, /accessibilityLabel="Clear search"/);
  assert.match(screen, /accessibilityLabel="Unpin message"/);
  assert.match(screen, /accessibilityLabel="Open original message"/);
  assert.match(screen, /minWidth: 48, minHeight: 48/);
});
