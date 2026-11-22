import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./VerifyEmailScreen.js', import.meta.url), 'utf8');

test('email verification opens with a Crown Aurora identity and a clear recipient confirmation', () => {
  assert.match(screen, /ONE LAST STEP/);
  assert.match(screen, /Verify your email/);
  assert.match(screen, /mail-unread-outline/);
  assert.match(screen, /Verification email:/);
  assert.match(screen, /YOUR 6-DIGIT CODE/);
  assert.match(screen, /Check your inbox and spam folder/);
  assert.match(screen, /GlassCard glow intensity=\{22\}/);
});

test('email verification keeps six-digit validation, one-time-code support and the existing service calls', () => {
  assert.match(screen, /\^\[0-9\]\{6\}\$/);
  assert.match(screen, /autoComplete="one-time-code"/);
  assert.match(screen, /verifySignupEmailOtp\(email, token\)/);
  assert.match(screen, /resendSignupEmailOtp\(email\)/);
  assert.match(screen, /if \(!SUPABASE_ENABLED\) navigation\.reset/);
});

test('verification actions expose loading and disabled states and do not send for a missing address', () => {
  assert.match(screen, /disabled=\{loading \|\| !email\}/);
  assert.match(screen, /disabled=\{resending \|\| !email\}/);
  assert.match(screen, /accessibilityState=\{\{ disabled: loading, busy: loading \}\}/);
  assert.match(screen, /accessibilityState=\{\{ disabled: resending, busy: resending \}\}/);
});
