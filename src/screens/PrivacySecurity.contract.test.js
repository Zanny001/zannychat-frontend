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
  assert.match(screen, /googleReauthVerifiedUserId/);
  assert.match(screen, /googleReauthVerifiedUserId !== currentUserId/);
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


test('Google account deletion copy matches the server five-minute reauthentication window', () => {
  assert.match(screen, /ACCOUNT_DELETE_REAUTH_TTL_MS = 4 \* 60 \* 1000 \+ 30 \* 1000/);
  assert.match(screen, /within five minutes/);
  assert.doesNotMatch(screen, /within ten minutes/);
});


test('Privacy Security clears blocked users and account-deletion proof when auth owner changes', () => {
  assert.match(screen, /const blockedRequestRef = useRef\(0\)/);
  assert.match(screen, /supabase\.auth\.onAuthStateChange/);
  assert.match(screen, /const nextUserId = session\?\.user\?\.id \|\| null/);
  assert.match(screen, /blockedRequestRef\.current \+= 1/);
  assert.match(screen, /setBlocked\(\[\]\)/);
  assert.match(screen, /setGoogleReauthVerifiedUserId\(null\)/);
  assert.match(screen, /setDeletePassword\(''\)/);
  assert.match(screen, /setDeleteConfirmation\(''\)/);
  assert.match(screen, /latestAuthData\?\.user\?\.id === userId/);
  assert.match(screen, /event === 'SIGNED_IN'/);
  assert.match(screen, /data\?\.subscription\?\.unsubscribe\?\.\(\)/);
});

test('blocked-user list refresh is bound to the same authenticated account before and after the request', () => {
  assert.match(screen, /const userId = authData\?\.user\?\.id \|\| null/);
  assert.match(screen, /expectedUserId && userId !== expectedUserId/);
  assert.match(screen, /requestId === blockedRequestRef\.current/);
});
