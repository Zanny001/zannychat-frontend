const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = JSON.parse(fs.readFileSync(path.join(__dirname, '../../app.json'), 'utf8'));
const auth = fs.readFileSync(path.join(__dirname, 'googleAuth.js'), 'utf8');
const client = fs.readFileSync(path.join(__dirname, 'supabaseClient.js'), 'utf8');
const navigator = fs.readFileSync(path.join(__dirname, '../navigation/AppNavigator.js'), 'utf8');

test('standalone Android declares OAuth and password recovery callback intent filters', () => {
  const filters = app.expo.android.intentFilters;
  assert.ok(filters.some((f) => f.data?.some((d) => d.scheme === 'zannychat' && d.host === 'auth' && d.pathPrefix === '/callback')));
  assert.ok(filters.some((f) => f.data?.some((d) => d.scheme === 'zannychat' && d.host === 'reset-password')));
});

test('native Google OAuth uses PKCE and handles a cold-start callback', () => {
  assert.match(client, /flowType: 'pkce'/);
  assert.match(auth, /exchangeCodeForSession/);
  assert.match(navigator, /Linking\.getInitialURL\(\)/);
  assert.match(navigator, /completeGoogleOAuthCallback/);
});
