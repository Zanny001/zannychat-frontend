import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./PrivacySecurityScreen.js', import.meta.url), 'utf8');
const api = readFileSync(new URL('../services/api.js', import.meta.url), 'utf8');
const googleAuth = readFileSync(new URL('../services/googleAuth.js', import.meta.url), 'utf8');

test('Google-only accounts have a provider reauthentication path for account deletion', () => {
  assert.match(screen, /authProviders\.google/);
  assert.match(screen, /startGoogleOAuth\(supabase, \{ prompt: 'select_account' \}\)/);
  assert.match(screen, /ACCOUNT_DELETE_REAUTH_KEY/);
  assert.match(screen, /pending\.userId === data\.user\.id/);
  assert.match(screen, /googleReauthVerified/);
  assert.match(screen, /if \(googleReauthMismatch\)/);
});

test('account deletion still requires exact DELETE confirmation and server-side fresh authentication', () => {
  assert.match(screen, /deleteConfirmation !== 'DELETE'/);
  assert.match(screen, /await deleteAccount\(deletePassword \|\| undefined\)/);
  assert.match(api, /if \(currentPassword\) \{/);
  assert.match(api, /backendFetch\('\/account\/delete'/);
  assert.match(api, /auth_time|verify your password again|verify your password/i);
});

test('Google reauthentication asks the provider to select and verify an account', () => {
  assert.match(googleAuth, /queryParams: \{ prompt \}/);
  assert.match(googleAuth, /redirectTo: getOAuthRedirectUrl\(\)/);
});


test('Google account deletion copy matches the ten-minute reauthentication window', () => {
  assert.match(screen, /ACCOUNT_DELETE_REAUTH_TTL_MS = 10 \* 60 \* 1000/);
  assert.equal((screen.match(/within ten minutes/g) || []).length, 2);
  assert.doesNotMatch(screen, /within five minutes/);
});
