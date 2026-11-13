import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidUsername, normalizeUsername } from './username.js';

test('normalizes usernames consistently for case-insensitive uniqueness', () => {
  assert.equal(normalizeUsername('  @John_Doe  '), 'john_doe');
  assert.equal(normalizeUsername('JANE99'), 'jane99');
  assert.equal(normalizeUsername(null), '');
});

test('accepts only 3–24 lowercase letters, digits and underscores', () => {
  assert.equal(isValidUsername('abc'), true);
  assert.equal(isValidUsername('user_name_24'), true);
  assert.equal(isValidUsername('ab'), false);
  assert.equal(isValidUsername('a'.repeat(25)), false);
  assert.equal(isValidUsername('two words'), false);
  assert.equal(isValidUsername('name.dot'), false);
  assert.equal(isValidUsername('@@name'), false);
});
