import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./DraftsScreen.js', import.meta.url), 'utf8');

test('draft conversation lookup failures with saved drafts expose an accessible retry action', () => {
  assert.match(screen, /drafts\.length > 0 \? \(/);
  assert.match(screen, /onPress=\{load\} accessibilityRole="button" accessibilityLabel="Retry loading draft conversations"/);
  assert.match(screen, /minHeight: 48/);
  assert.match(screen, /Retry conversation lookup/);
});

test('drafts remain visible when conversation details fail to load', () => {
  assert.match(screen, /error && drafts\.length === 0/);
  assert.match(screen, /ListHeaderComponent=\{/);
  assert.match(screen, /data=\{drafts\}/);
});
