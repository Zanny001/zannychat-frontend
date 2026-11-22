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

test('session inventory refresh and retry actions meet the 48pt touch target', () => {
  assert.match(screen, /minHeight: 48, minWidth: 72/);
  assert.match(screen, /minHeight: 48, alignSelf: 'flex-start'/);
});

test('session inventory supports searchable mobile and desktop filters with live counts', () => {
  assert.match(screen, /const \[sessionSearch, setSessionSearch\] = useState\(''\)/);
  assert.match(screen, /const \[sessionFilter, setSessionFilter\] = useState\('all'\)/);
  assert.match(screen, /const visibleSessions = otherSessions\.filter/);
  assert.match(screen, /Search active sessions by device or browser/);
  assert.match(screen, /Clear session search/);
  assert.match(screen, /key: 'mobile', label: 'Mobile'/);
  assert.match(screen, /key: 'desktop', label: 'Desktop'/);
  assert.match(screen, /visibleSessions\.map\(\(item\) => \(/);
  assert.match(screen, /sessionCounts\[option\.key\]/);
});

test('session search and filters do not alter account-wide sign-out or disclose sensitive session identifiers', () => {
  assert.match(screen, /await signOutEverywhere\(\)/);
  assert.match(screen, /await signOutThisDevice\(\)/);
  assert.match(screen, /supabase\.rpc\('list_my_auth_sessions'\)/);
  assert.doesNotMatch(screen, /item\.ip|item\.refresh_token|refresh_token_hmac/i);
  assert.doesNotMatch(screen, /revoke_my_auth_session/);
});

test('session filters expose accessible selection states and comfortable touch targets', () => {
  assert.match(screen, /accessibilityRole="radio"/);
  assert.match(screen, /accessibilityState=\{\{ checked: selected \}\}/);
  assert.match(screen, /minHeight: 44, flexDirection: 'row'/);
  assert.match(screen, /accessibilityLabel="Search active sessions by device or browser"/);
});

test('Android user agents are classified as mobile rather than overlapping desktop Linux sessions', () => {
  assert.match(screen, /function isMobileSession\(userAgent\)/);
  assert.match(screen, /function isDesktopSession\(userAgent\)/);
  assert.match(screen, /return !isMobileSession\(value\) && \/Windows\|Mac OS X\|Macintosh\|Linux\/i\.test\(value\)/);
  assert.match(screen, /isMobileSession\(item\.user_agent\)/);
  assert.match(screen, /isDesktopSession\(item\.user_agent\)/);
});
