import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGoogleOAuthCallback } from './googleOAuthCallback.js';

test('parses an authorization code from the native callback query', () => {
  assert.deepEqual(
    parseGoogleOAuthCallback('zannychat://auth/callback?code=abc123'),
    { code: 'abc123' }
  );
});

test('parses an authorization code from the callback fragment', () => {
  assert.deepEqual(
    parseGoogleOAuthCallback('zannychat://auth/callback#code=abc123'),
    { code: 'abc123' }
  );
});

test('returns provider callback errors without accepting a code', () => {
  assert.deepEqual(
    parseGoogleOAuthCallback(
      'zannychat://auth/callback?error=access_denied&error_description=User%20cancelled'
    ),
    { error: 'User cancelled' }
  );
});

test('rejects unrelated protocols and routes', () => {
  assert.equal(parseGoogleOAuthCallback('https://example.com/auth/callback?code=x'), null);
  assert.equal(parseGoogleOAuthCallback('zannychat://reset-password?code=x'), null);
  assert.equal(parseGoogleOAuthCallback('zannychat://auth/other?code=x'), null);
});

test('rejects callbacks missing a code or provider error', () => {
  assert.equal(parseGoogleOAuthCallback('zannychat://auth/callback'), null);
  assert.equal(parseGoogleOAuthCallback('not a URL'), null);
  assert.equal(parseGoogleOAuthCallback(null), null);
});
