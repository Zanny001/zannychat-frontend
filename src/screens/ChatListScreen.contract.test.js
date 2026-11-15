import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./ChatListScreen.js', import.meta.url), 'utf8');

test('inbox filter chips keep a 44-point minimum touch height with centered labels', () => {
  assert.match(screen, /filterPill: \{ minHeight: 44/);
  assert.match(screen, /filterPill: \{[^}]*alignItems: 'center'[^}]*justifyContent: 'center'/);
});

test('inbox filters expose the selected state to assistive technology', () => {
  assert.ok(screen.includes('accessibilityRole="button"'));
  assert.ok(screen.includes('accessibilityState={{ selected: active }}'));
  assert.ok(screen.includes('accessibilityLabel={`${filter.label} filter`}'));
});

test('Chats header actions and search field keep moderate accessible dimensions', () => {
  assert.match(screen, /cameraBtn: \{ width: 44, height: 44, minWidth: 44, minHeight: 44/);
  assert.match(screen, /draftsBtn: \{ width: 44, height: 44, minWidth: 44, minHeight: 44/);
  assert.match(screen, /newChatBtn: \{ width: 44, height: 44, minWidth: 44, minHeight: 44/);
  assert.match(screen, /searchBar: \{ minHeight: 48/);
  assert.match(screen, /accessibilityLabel="See all moments" style=\{\{ minHeight: 44/);
});
