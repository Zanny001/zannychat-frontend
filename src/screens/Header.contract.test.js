import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const header = fs.readFileSync(new URL('../components/Header.js', import.meta.url), 'utf8');

test('shared header controls use accessible Pressable interactions', () => {
  assert.ok(header.includes('Pressable'));
  assert.equal(header.includes('TouchableOpacity'), false);
  assert.ok(header.includes('accessibilityRole="button"'));
  assert.ok(header.includes('accessibilityLabel="Go back"'));
});

test('shared header back control meets the 44-point touch target and shows pressed feedback', () => {
  assert.ok(header.includes('minWidth: 44'));
  assert.ok(header.includes('minHeight: 44'));
  assert.ok(header.includes('pressed && { backgroundColor: hexToRgba(colors.primary, 0.12) }'));
});
