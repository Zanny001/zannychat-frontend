import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const eas = JSON.parse(fs.readFileSync(new URL('../../eas.json', import.meta.url), 'utf8'));
const app = JSON.parse(fs.readFileSync(new URL('../../app.json', import.meta.url), 'utf8'));
const supabaseClient = fs.readFileSync(new URL('../services/supabaseClient.js', import.meta.url), 'utf8');
const backendClient = fs.readFileSync(new URL('../services/backendClient.js', import.meta.url), 'utf8');
const gitignore = fs.readFileSync(new URL('../../.gitignore', import.meta.url), 'utf8');
const easignore = fs.readFileSync(new URL('../../.easignore', import.meta.url), 'utf8');
const envExample = fs.readFileSync(new URL('../../.env.example', import.meta.url), 'utf8');

for (const profileName of ['preview', 'production']) {
  test(`${profileName} EAS profile connects to the canonical production services`, () => {
    const env = eas.build[profileName]?.env || {};
    assert.equal(env.EXPO_PUBLIC_BACKEND_URL, 'https://zannychat-backend-1.onrender.com');
    assert.equal(env.EXPO_PUBLIC_SUPABASE_URL, 'https://vithpppgyjmazxvogvno.supabase.co');
    assert.ok(env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_'));
  });
}

test('runtime clients accept the EAS publishable key and preserve legacy local env compatibility', () => {
  assert.ok(supabaseClient.includes('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY'));
  assert.ok(backendClient.includes('process.env.EXPO_PUBLIC_BACKEND_URL'));
  assert.ok(envExample.includes('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY='));
});

test('Firebase client config is ignored by Git but included by the EAS upload allowlist', () => {
  assert.ok(gitignore.includes('google-services.json'));
  assert.ok(gitignore.includes('/android/'));
  assert.ok(easignore.includes('!google-services.json'));
  assert.equal(app.expo.android.googleServicesFile, './google-services.json');
  assert.ok(easignore.includes('.env'));
  assert.ok(easignore.includes('*service-account*.json'));
  assert.ok(easignore.includes('*.pem'));
  assert.ok(easignore.includes('**/local.properties'));
  assert.ok(easignore.includes('*.jks'));
  assert.ok(easignore.includes('*.keystore'));
});

test('EAS profiles do not contain server-side credentials', () => {
  const serialized = JSON.stringify(eas).toLowerCase();
  assert.equal(serialized.includes('service_role'), false);
  assert.equal(serialized.includes('fcm_service_account_json'), false);
  assert.equal(serialized.includes('apns_private_key'), false);
});
