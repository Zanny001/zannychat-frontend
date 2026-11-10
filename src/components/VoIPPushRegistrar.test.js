import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const registrar = fs.readFileSync(new URL('./VoIPPushRegistrar.native.js', import.meta.url), 'utf8');
const calls = fs.readFileSync(new URL('../services/calls.js', import.meta.url), 'utf8');

test('native devices register APNs VoIP or FCM tokens only after authenticated session is available', () => {
  assert.ok(registrar.includes('useVoIPPushToken'));
  assert.ok(registrar.includes('registerVoIPPush()'));
  assert.ok(registrar.includes('supabase.auth.getSession()'));
  assert.ok(calls.includes("backendFetch('/calls/voip-token'"));
});

test('sign-out cleanup can identify the current device VoIP token', () => {
  const registrar = fs.readFileSync(new URL('./VoIPPushRegistrar.native.js', import.meta.url), 'utf8');
  const api = fs.readFileSync(new URL('../services/api.js', import.meta.url), 'utf8');
  assert.ok(registrar.includes('setActiveVoipPushToken(token?.token || null)'));
  assert.ok(registrar.includes('setActiveApnsAlertToken(alertToken)'));
  assert.ok(api.includes('getActiveVoipPushToken()'));
  assert.ok(api.includes('getActiveApnsAlertToken()'));
  assert.ok(api.includes('const tokens = [...new Set([getActiveVoipPushToken(), getActiveApnsAlertToken()].filter(Boolean))]'));
  assert.ok(api.includes("backendFetch('/calls/voip-token'"));
  assert.ok(api.includes("removeVoipTokensBeforeSignOut('global')"));
  assert.ok(api.includes("removeVoipTokensBeforeSignOut('local')"));
});

test('iOS registers a separate standard APNs alert token for terminated call-end notices', () => {
  assert.ok(registrar.includes("getDevicePushTokenAsync()"));
  assert.ok(registrar.includes("'APNS_ALERT'"));
  assert.ok(registrar.includes("Platform.OS !== 'ios'"));
  assert.ok(calls.includes("'APNS_ALERT'"));
  assert.ok(api.includes('setActiveApnsAlertToken(null)') === false); // Registrar clears the in-memory token on unmount.
});
