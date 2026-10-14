import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidEmail, normalizeEmail, parseRecoveryCallback, parseRecoveryTokens, validatePasswordChange, validateSignup } from './authValidation.js';

test('normalizes and validates ordinary email addresses', () => {
  assert.equal(normalizeEmail('  User@Example.com '), 'user@example.com');
  assert.equal(isValidEmail('User@Example.com'), true);
  assert.equal(isValidEmail('user@localhost'), false);
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidEmail('a..b@example.com'), false);
});

test('validates signup inputs without revealing which email accounts exist', () => {
  assert.match(validateSignup({ name: 'A', email: 'x@example.com', password: 'password123', confirmPassword: 'password123' }), /name/);
  assert.match(validateSignup({ name: 'Alex', email: 'bad', password: 'password123', confirmPassword: 'password123' }), /email/);
  assert.match(validateSignup({ name: 'Alex', email: 'alex@example.com', password: 'short', confirmPassword: 'short' }), /8 characters/);
  assert.match(validateSignup({ name: 'Alex', email: 'alex@example.com', password: 'password123', confirmPassword: 'password321' }), /do not match/);
  assert.equal(validateSignup({ name: 'Alex', email: 'alex@example.com', password: 'password123', confirmPassword: 'password123' }), null);
});

test('parses recovery tokens from a Supabase deep-link fragment', () => {
  assert.deepEqual(
    parseRecoveryTokens('zannychat://reset-password#access_token=access123&refresh_token=refresh456&type=recovery'),
    { accessToken: 'access123', refreshToken: 'refresh456' },
  );
  assert.equal(parseRecoveryTokens('zannychat://reset-password#access_token=only-access&type=recovery'), null);
  assert.equal(parseRecoveryTokens('zannychat://reset-password#access_token=a&refresh_token=b&type=signup'), null);
  assert.equal(parseRecoveryTokens('zannychat://reset-password#access_token=a&refresh_token=b'), null);
});

test('validates password changes and confirmation', () => {
  assert.match(validatePasswordChange('short', 'short'), /at least 8/);
  assert.match(validatePasswordChange('a'.repeat(129), 'a'.repeat(129)), /128 characters/);
  assert.equal(validatePasswordChange('a-strong-password', 'different-password'), 'Passwords do not match.');
  assert.equal(validatePasswordChange('a-strong-password', 'a-strong-password'), null);
});

test('parses PKCE recovery codes and validates the callback route', () => {
  assert.deepEqual(parseRecoveryCallback('zannychat://reset-password?code=pkce-code'), { code: 'pkce-code' });
  assert.deepEqual(
    parseRecoveryCallback('zannychat://reset-password#access_token=access123&refresh_token=refresh456&type=recovery'),
    { accessToken: 'access123', refreshToken: 'refresh456' },
  );
  assert.equal(parseRecoveryCallback('zannychat://other-route?code=pkce-code'), null);
  assert.equal(parseRecoveryCallback('https://example.com/reset-password?code=pkce-code'), null);
});
