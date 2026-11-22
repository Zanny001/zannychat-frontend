import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const verify = read('./VerifyEmailScreen.js');
const recovery = read('./PasswordRecoveryScreen.js');
const reset = read('./PasswordResetScreen.js');
const redirects = read('../utils/oauthRedirect.js');

test('email verification presents a clear, accessible security step without changing OTP behavior', () => {
  assert.match(verify, /ACCOUNT SECURITY\s+·\s+STEP 02/);
  assert.match(verify, /One last step\./);
  assert.match(verify, /accessibilityLabel="Email verification code"/);
  assert.match(verify, /verifySignupEmailOtp\(email, token\)/);
  assert.match(verify, /resendSignupEmailOtp\(email\)/);
  assert.match(verify, /SUPABASE_ENABLED/);
  assert.match(verify, /minHeight: 54/);
});

test('password recovery keeps account-enumeration protection and current production guidance', () => {
  assert.match(recovery, /ACCOUNT ACCESS\s+·\s+RECOVERY/);
  assert.match(recovery, /normalizeEmail\(email\)/);
  assert.match(recovery, /isValidEmail\(normalizedEmail\)/);
  assert.match(recovery, /requestPasswordReset\(normalizedEmail\)/);
  assert.match(recovery, /Deliberately generic: do not disclose whether an account exists/);
  assert.match(recovery, /https:\/\/zannychat\.vercel\.app\/\*\*/);
  assert.doesNotMatch(recovery, /zannychat-app\.netlify\.app/);
});

test('password reset retains callback validation, password bounds and completion flow', () => {
  assert.match(reset, /ACCOUNT SECURITY\s+·\s+FINAL STEP/);
  assert.match(reset, /completePasswordReset\(callbackUrl, password\)/);
  assert.match(reset, /password\.length < 8/);
  assert.match(reset, /password\.length > 128/);
  assert.match(reset, /password !== confirmPassword/);
  assert.match(reset, /Linking\.addEventListener\('url'/);
  assert.match(reset, /navigation\.reset\(\{ index: 0, routes: \[\{ name: 'Login' \}\] \}\)/);
});

test('OAuth, signup confirmation and password recovery share the canonical Vercel destination', () => {
  assert.match(redirects, /PRODUCTION_WEB_REDIRECT_URL = 'https:\/\/zannychat\.vercel\.app'/);
  assert.match(redirects, /https:\/\/zannychat-app\.netlify\.app/);
  assert.match(redirects, /https:\/\/zannychat\.netlify\.app/);
  assert.match(redirects, /return `\$\{getWebOrigin\(\)\}\/\?reset-password=1`/);
  assert.match(redirects, /return getWebOrigin\(\)/);
});
