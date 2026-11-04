import test from 'node:test';
import assert from 'node:assert/strict';
import { getStatusBarStyle } from './themeAppearance.js';

test('light appearance uses dark status-bar icons for contrast', () => {
  assert.equal(getStatusBarStyle('light'), 'dark');
});

test('dark appearance uses light status-bar icons for contrast', () => {
  assert.equal(getStatusBarStyle('dark'), 'light');
});

test('unknown appearance safely defaults to light status-bar icons', () => {
  assert.equal(getStatusBarStyle('unknown'), 'light');
});
