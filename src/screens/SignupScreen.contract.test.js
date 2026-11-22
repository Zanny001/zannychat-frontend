import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./SignupScreen.js', import.meta.url), 'utf8');

test('Signup presents a Crown Aurora welcome with the recognizable brand knot', () => {
  assert.match(screen, /YOUR NEXT CHAPTER STARTS HERE/);
  assert.match(screen, /Find your people\./);
  assert.match(screen, /Create your place in the conversation/);
  assert.match(screen, /<Knot size=\{36\}/);
});

test('Signup retains email validation, Google OAuth and email-confirmation routing', () => {
  assert.match(screen, /validateSignup\(/);
  assert.match(screen, /signUpWithEmail\(/);
  assert.match(screen, /startGoogleOAuth\(supabase\)/);
  assert.match(screen, /navigation\.navigate\('VerifyEmail'/);
  assert.match(screen, /navigation\.navigate\('Login'\)/);
});

test('Signup actions keep comfortable touch targets and busy accessibility states', () => {
  assert.match(screen, /minHeight: 54/);
  assert.match(screen, /minHeight: 48, justifyContent: 'center', alignItems: 'center'/);
  assert.match(screen, /accessibilityState=\{\{ disabled: loading, busy: loading \}\}/);
});
