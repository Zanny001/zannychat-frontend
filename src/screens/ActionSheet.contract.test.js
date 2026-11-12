import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sheet = fs.readFileSync(new URL('../components/ActionSheet.js', import.meta.url), 'utf8');

test('action sheet uses Pressable for reactions, options and cancel actions', () => {
  assert.ok(sheet.includes('Pressable'));
  assert.equal(sheet.includes('TouchableOpacity'), false);
  assert.ok(sheet.includes('accessibilityViewIsModal'));
  assert.ok(sheet.includes('accessible={false}'));
  assert.ok(sheet.includes('accessibilityRole="button"'));
});

test('action sheet exposes selected and disabled states with pressed feedback', () => {
  assert.ok(sheet.includes('accessibilityState={{ selected: Boolean(reaction.active) }}'));
  assert.ok(sheet.includes('disabled={Boolean(option.disabled)}'));
  assert.ok(sheet.includes('pressed && { backgroundColor: hexToRgba(colors.primary, 0.08) }'));
});

test('action sheet actions retain comfortable mobile touch targets', () => {
  assert.ok(sheet.includes('width: 44'));
  assert.ok(sheet.includes('height: 44'));
  assert.ok(sheet.includes('minHeight: 48'));
});
