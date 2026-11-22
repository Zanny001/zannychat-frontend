import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./LoginScreen.js', import.meta.url), 'utf8');

test('Login presents a Crown Aurora welcome while retaining the brand knot', () => {
  assert.match(screen, /YOUR WORLD, RECONNECTED/);
  assert.match(screen, /Welcome back\./);
  assert.match(screen, /Your conversations are waiting\./);
  assert.match(screen, /<Knot size=\{38\}/);
});

test('Login keeps email, password, Google and recovery flows intact', () => {
  assert.match(screen, /signInWithEmail\(normalizeEmail\(email\), password\)/);
  assert.match(screen, /startGoogleOAuth\(supabase\)/);
  assert.match(screen, /navigation\.navigate\('PasswordRecovery'\)/);
  assert.match(screen, /navigation\.navigate\('Signup'\)/);
});

test('Login primary actions and secondary navigation retain comfortable mobile targets', () => {
  assert.match(screen, /button: \{ minHeight: 54/);
  assert.match(screen, /minHeight: 48, justifyContent: 'center', alignItems: 'flex-end'/);
  assert.match(screen, /minHeight: 48, justifyContent: 'center', alignItems: 'center'/);
  assert.match(screen, /accessibilityState=\{\{ disabled: loading, busy: loading \}\}/);
});
