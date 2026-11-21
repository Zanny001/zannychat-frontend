import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./SharedMediaScreen.js', import.meta.url), 'utf8');

test('Shared Media lightbox close action meets the 48-point mobile touch target', () => {
  assert.ok(screen.includes("lightboxClose: { position: 'absolute', top: 44, right: 20, zIndex: 2, width: 48, height: 48"));
  assert.ok(screen.includes('accessibilityLabel="Close photo preview"'));
});
