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
