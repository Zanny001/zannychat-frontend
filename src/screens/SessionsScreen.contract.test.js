import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./SessionsScreen.js', import.meta.url), 'utf8');

test('session screen loads an authenticated, server-verified active session inventory', () => {
  assert.match(screen, /supabase\.rpc\('list_my_auth_sessions'\)/);
  assert.match(screen, /sessions\.filter\(\(item\) => !item\.is_current\)/);
  assert.match(screen, /sessionDeviceLabel\(item\.user_agent\)/);
  assert.match(screen, /Last active:/);
  assert.match(screen, /Signed in:/);
  assert.doesNotMatch(screen, /cannot safely enumerate a list of every signed-in device/i);
});

test('session inventory failure is honest and retryable without disabling global sign-out', () => {
  assert.match(screen, /Active sessions could not be loaded/);
  assert.match(screen, /Retry loading active sessions/);
  assert.match(screen, /Sign out everywhere/);
  assert.match(screen, /access tokens may remain valid until their expiry/i);
});

test('session inventory does not display IP addresses or expose individual token revocation', () => {
  assert.doesNotMatch(screen, /item\.ip|item\.refresh_token|refresh_token_hmac/i);
  assert.doesNotMatch(screen, /revoke_my_auth_session/);
});

test('session inventory refresh and retry actions meet the 44pt touch target', () => {
  assert.match(screen, /minHeight: 44, minWidth: 72/);
  assert.match(screen, /minHeight: 44, alignSelf: 'flex-start'/);
});
