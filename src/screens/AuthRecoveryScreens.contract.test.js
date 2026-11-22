import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL('./' + name, import.meta.url), 'utf8');
const recovery = read('PasswordRecoveryScreen.js');
const reset = read('PasswordResetScreen.js');
const verify = read('VerifyEmailScreen.js');

test('password recovery uses a privacy-first Crown Aurora entry and generic submission confirmation', () => {
  assert.ok(recovery.includes('ZANNYCHAT · ACCOUNT RECOVERY'));
  assert.ok(recovery.includes('Your way back in.'));
  assert.ok(recovery.includes('We never reveal whether an email has an account.'));
  assert.ok(recovery.includes('If an account matches that address, recovery instructions can be sent.'));
  assert.ok(recovery.includes('requestPasswordReset(normalizedEmail)'));
  assert.ok(recovery.includes('normalizeEmail(email)'));
  assert.ok(recovery.includes('isValidEmail(normalizedEmail)'));
  assert.ok(recovery.includes("accessibilityLabel={loading ? 'Requesting password reset' : 'Send recovery instructions'}"));
  assert.ok(recovery.includes('minHeight: 54'));
});

test('password recovery preserves demo mode, rate-limit and redirect handling without exposing account existence', () => {
  assert.ok(recovery.includes('if (!SUPABASE_ENABLED)'));
  assert.ok(recovery.includes('rate limit|too many requests'));
  assert.ok(recovery.includes('redirect|url.*(allow|valid)|not allowed'));
  assert.ok(recovery.includes('setSubmitted(true)'));
  assert.ok(recovery.includes('Back to'));
});

test('password reset provides live rules while preserving recovery-link validation and secure completion', () => {
  assert.ok(reset.includes('ZANNYCHAT · SECURE YOUR ACCOUNT'));
  assert.ok(reset.includes('const lengthValid = password.length >= 8 && password.length <= 128'));
  assert.ok(reset.includes('const passwordsMatch = password.length > 0 && password === confirmPassword'));
  assert.ok(reset.includes('Between 8 and 128 characters'));
  assert.ok(reset.includes('Both entries match'));
  assert.ok(reset.includes('completePasswordReset(callbackUrl, password)'));
  assert.ok(reset.includes('if (!callbackUrl)'));
  assert.ok(reset.includes("cleanUrl.searchParams.delete('reset-password')"));
  assert.ok(reset.includes("navigation.reset({ index: 0, routes: [{ name: 'Login' }] })"));
});

test('password reset retains universal and native deep-link listeners and disables mock-mode submission', () => {
  assert.ok(reset.includes('Linking.getInitialURL()'));
  assert.ok(reset.includes("Linking.addEventListener('url'"));
  assert.ok(reset.includes('subscription.remove()'));
  assert.ok(reset.includes('disabled={loading || !SUPABASE_ENABLED}'));
});

test('email verification keeps six-digit OTP, resend and auth-session routing intact', () => {
  assert.ok(verify.includes('ZANNYCHAT · ONE LAST STEP'));
  assert.ok(verify.includes('Verify your email to finish setting up your ZannyChat account.'));
  assert.ok(verify.includes("value.replace(/[^0-9]/g, '').slice(0, 6)"));
  assert.ok(verify.includes('verifySignupEmailOtp(email, token)'));
  assert.ok(verify.includes('resendSignupEmailOtp(email)'));
  assert.ok(verify.includes("navigation.reset({ index: 0, routes: [{ name: 'Main' }] })"));
  assert.ok(verify.includes('SIGNED_IN'));
  assert.ok(verify.includes('accessibilityLabel="Verify email address"'));
  assert.ok(verify.includes('accessibilityLabel="Resend verification code"'));
});

test('all recovery and verification screens retain comfortable touch targets and themed surfaces', () => {
  for (const source of [recovery, reset, verify]) {
    assert.ok(source.includes('useTheme()'));
    assert.ok(source.includes('minHeight: 54'));
    assert.ok(source.includes('minHeight: 48'));
    assert.ok(source.includes('SafeAreaView'));
    assert.ok(source.includes('KeyboardAvoidingView'));
  }
});

test('password recovery redirect guidance names the current Vercel production origin', () => {
  assert.ok(recovery.includes('https://zannychat.vercel.app/**'));
  assert.ok(!recovery.includes('zannychat-app.netlify.app'));
});
