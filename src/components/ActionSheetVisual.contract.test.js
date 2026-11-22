import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./ActionSheet.js', import.meta.url), 'utf8');

test('conversation action sheet uses an editorial Crown Aurora header without changing its caller-provided title', () => {
  assert.ok(source.includes('ZANNYCHAT · QUICK ACTIONS'));
  assert.ok(source.includes('typography.title'));
  assert.ok(source.includes('{title}'));
  assert.ok(source.includes('numberOfLines={1}'));
});

test('conversation actions use distinct theme-aware icon wells and comfortable touch rows', () => {
  assert.ok(source.includes('width: 36'));
  assert.ok(source.includes('height: 36'));
  assert.ok(source.includes('hexToRgba(colors.primary, 0.1)'));
  assert.ok(source.includes('hexToRgba(colors.danger, 0.1)'));
  assert.ok(source.includes('optionRow: { minHeight: 60'));
  assert.ok(source.includes('accessibilityRole="button"'));
});

test('action sheet preserves reaction selection, disabled actions and close behavior', () => {
  assert.ok(source.includes('accessibilityState={{ selected: Boolean(reaction.active) }}'));
  assert.ok(source.includes('disabled={Boolean(option.disabled)}'));
  assert.ok(source.includes('onRequestClose={onClose}'));
  assert.ok(source.includes('onPress={onClose}'));
});
