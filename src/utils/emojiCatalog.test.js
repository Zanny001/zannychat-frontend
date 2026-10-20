import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_EMOJIS, EMOJI_CATEGORIES } from './emojiCatalog.js';
import { readFileSync } from 'node:fs';

test('emoji catalog covers major chat emoji categories and has usable entries', () => {
  assert.ok(EMOJI_CATEGORIES.length >= 8);
  assert.ok(ALL_EMOJIS.length >= 500, `expected broad emoji coverage, got ${ALL_EMOJIS.length}`);
  for (const category of EMOJI_CATEGORIES) {
    assert.ok(category.label && category.icon && category.emojis.length > 0);
  }
  for (const expected of ['😀', '😂', '🥰', '👍', '🙏', '🐶', '🍕', '⚽', '🚗', '📱', '✅', '🇳🇬']) {
    assert.ok(ALL_EMOJIS.includes(expected), `missing ${expected}`);
  }
});

test('chat composer exposes accessible emoji categories and insertion controls', () => {
  const source = readFileSync(new URL('../components/InputBar.js', import.meta.url), 'utf8');
  assert.match(source, /Open emoji picker/);
  assert.match(source, /Close emoji picker/);
  assert.match(source, /Insert \$\{emoji\}/);
  assert.match(source, /EMOJI_CATEGORIES\[emojiCategory\]\.emojis/);
});
