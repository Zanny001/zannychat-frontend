import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./ChatListScreen.js', import.meta.url), 'utf8');

test('inbox filter chips keep a 44-point minimum touch height with centered labels', () => {
  assert.match(screen, /filterPill: \\{ minHeight: 44/);
  assert.match(screen, /filterPill: \\{[^}]*alignItems: 'center'[^}]*justifyContent: 'center'/);
});

test('inbox filters expose the selected state to assistive technology', () => {
  assert.ok(screen.includes('accessibilityRole="button"'));
  assert.ok(screen.includes('accessibilityState={{ selected: active }}'));
  assert.ok(screen.includes('accessibilityLabel={`${filter.label} filter`}'));
});
