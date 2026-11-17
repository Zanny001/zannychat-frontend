import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./useAuthenticatedUserId.js', import.meta.url), 'utf8');

test('authenticated owner hook uses Supabase auth events and unsubscribes cleanly', () => {
  assert.match(source, /supabase\.auth\.onAuthStateChange/);
  assert.match(source, /session\?\.user\?\.id \|\| null/);
  assert.match(source, /data\?\.subscription\?\.unsubscribe\?\.\(\)/);
});

test('authenticated owner hook initializes once and notifies on subsequent account changes', () => {
  assert.match(source, /previousUserId === undefined/);
  assert.match(source, /previousUserId === nextUserId/);
  assert.match(source, /onChangeRef\.current\?\.\(nextUserId, previousUserId\)/);
  assert.match(source, /userIdRef\.current = nextUserId/);
});

test('authenticated owner hook preserves mock-mode fallback', () => {
  assert.match(source, /if \(SUPABASE_ENABLED && supabase\?\.auth\?\.onAuthStateChange\)/);
  assert.match(source, /applyUserId\(user\?\.id \|\| 'me'\)/);
  assert.match(source, /applyUserId\('me'\)/);
});
