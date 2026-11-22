import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./PasswordResetScreen.js', import.meta.url), 'utf8');

test('password reset provides live requirements and a Crown Aurora security surface', () => {
  assert.match(screen, /CREATE A STRONG NEW PASSWORD/);
  assert.match(screen, /GlassCard glow intensity=\{16\}/);
  assert.match(screen, /Between 8 and 128 characters/);
  assert.match(screen, /Both passwords match/);
  assert.match(screen, /Enter the password again to confirm/);
  assert.match(screen, /const passwordLengthValid = password\.length >= 8 && password\.length <= 128/);
  assert.match(screen, /const passwordsMatch = confirmPassword\.length > 0 && password === confirmPassword/);
});

test('password visibility controls are accessible and both fields default to hidden', () => {
  assert.match(screen, /secureTextEntry=\{!showPassword\}/);
  assert.match(screen, /secureTextEntry=\{!showConfirmPassword\}/);
  assert.match(screen, /Show new password/);
  assert.match(screen, /Hide new password/);
  assert.match(screen, /Show confirmation password/);
  assert.match(screen, /Hide confirmation password/);
});

test('password reset retains the existing validation, recovery callback and completion service', () => {
  assert.match(screen, /password\.length < 8/);
  assert.match(screen, /password\.length > 128/);
  assert.match(screen, /password !== confirmPassword/);
  assert.match(screen, /if \(!callbackUrl\)/);
  assert.match(screen, /await completePasswordReset\(callbackUrl, password\)/);
  assert.match(screen, /navigation\.reset\(\{ index: 0, routes: \[\{ name: 'Login' \}\] \}\)/);
});
