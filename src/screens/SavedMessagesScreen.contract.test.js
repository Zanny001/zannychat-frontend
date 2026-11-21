import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./SavedMessagesScreen.js', import.meta.url), 'utf8');

test('saved messages load failures are distinct from a genuine empty collection', () => {
  assert.ok(screen.includes(' : error ? ('));
  assert.match(screen, /Retry loading saved messages/);
  assert.match(screen, /ListEmptyComponent=/);
  assert.match(screen, /Nothing saved yet/);
});

test('saved message search and open/remove actions have accessible labels and mobile targets', () => {
  assert.match(screen, /accessibilityLabel="Search saved messages"/);
  assert.match(screen, /accessibilityLabel="Clear search"/);
  assert.match(screen, /accessibilityLabel="Remove saved message"/);
  assert.match(screen, /accessibilityLabel="Open saved message in conversation"/);
  assert.match(screen, /minWidth: 48, minHeight: 48/);
});
