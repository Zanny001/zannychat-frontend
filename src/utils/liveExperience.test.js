import test from 'node:test';
import assert from 'node:assert/strict';
import { LIVE_CATEGORY_THEMES, getLiveCategoryTheme } from './liveExperience.js';

test('themed LIVE offers distinct visual identities for every discussion category', () => {
  for (const category of ['entertainment', 'social', 'politics', 'science', 'education', 'finance', 'technology', 'sports', 'business', 'health', 'other']) {
    const theme = getLiveCategoryTheme(category);
    assert.ok(theme.label);
    assert.ok(theme.icon);
    assert.ok(theme.background);
    assert.ok(theme.glow);
    assert.ok(theme.accent);
  }
  assert.equal(Object.keys(LIVE_CATEGORY_THEMES).length, 11);
});

test('unknown LIVE categories safely fall back to the social visual theme', () => {
  assert.equal(getLiveCategoryTheme('unknown'), LIVE_CATEGORY_THEMES.social);
});
