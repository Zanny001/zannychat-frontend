import test from 'node:test';
import assert from 'node:assert/strict';
import { getStatusProgressPercent } from './statusProgress.js';

test('status progress reports elapsed duration as a percentage', () => {
  assert.equal(getStatusProgressPercent(0, 10000), 0);
  assert.equal(getStatusProgressPercent(2500, 10000), 25);
  assert.equal(getStatusProgressPercent(10000, 10000), 100);
});

test('status progress clamps values and handles invalid durations safely', () => {
  assert.equal(getStatusProgressPercent(-5, 10000), 0);
  assert.equal(getStatusProgressPercent(20000, 10000), 100);
  assert.equal(getStatusProgressPercent(1000, 0), 0);
  assert.equal(getStatusProgressPercent(NaN, 10000), 0);
});
