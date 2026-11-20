import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screens = [
  'OnboardingScreen.js',
  'LoginScreen.js',
  'SignupScreen.js',
  'PasswordRecoveryScreen.js',
  'VerifyEmailScreen.js',
  'PasswordResetScreen.js',
  'AuthRequiredScreen.js',
];

test('authentication journeys share a moderate form width token', () => {
  const tokens = readFileSync(new URL('../theme/colors.js', import.meta.url), 'utf8');
  assert.match(tokens, /formMaxWidth: 480/);
  for (const file of screens) {
    const source = readFileSync(new URL('./' + file, import.meta.url), 'utf8');
    assert.match(source, /layout\.formMaxWidth/, file + ' must use the shared form width');
    assert.match(source, /maxWidth: layout\.formMaxWidth/, file + ' must cap wide-screen form content');
    assert.match(source, /alignSelf: 'center'/, file + ' must center its form content');
  }
});

test('auth forms remain fluid on narrow screens', () => {
  for (const file of screens.slice(1, 6)) {
    const source = readFileSync(new URL('./' + file, import.meta.url), 'utf8');
    assert.match(source, /width: '100%', maxWidth: layout\.formMaxWidth/, file + ' must remain responsive');
  }
});
