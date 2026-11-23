import test from 'node:test';
import assert from 'node:assert/strict';
import { hexToRgba } from './color.js';

test('converts six-digit hex colors without changing channels', () => {
  assert.equal(hexToRgba('#6A4DFF', 0.2), 'rgba(106, 77, 255, 0.2)');
});

test('supports shorthand three-digit hex colors', () => {
  assert.equal(hexToRgba('#abc', 0.5), 'rgba(170, 187, 204, 0.5)');
});

test('invalid color inputs fail closed without throwing', () => {
  for (const value of [null, undefined, '', 'red', '#12', '#GGGGGG', 42, {}]) {
    assert.doesNotThrow(() => hexToRgba(value));
    assert.equal(hexToRgba(value), 'rgba(0, 0, 0, 0)');
  }
});

test('alpha values are finite and clamped to the supported range', () => {
  assert.equal(hexToRgba('#000000', -1), 'rgba(0, 0, 0, 0)');
  assert.equal(hexToRgba('#000000', 2), 'rgba(0, 0, 0, 1)');
  assert.equal(hexToRgba('#000000', Number.NaN), 'rgba(0, 0, 0, 1)');
});
