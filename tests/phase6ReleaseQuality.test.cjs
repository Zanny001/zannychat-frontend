const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const workflow = fs.readFileSync(path.join(root, '.github/workflows/advanced-calling-client.yml'), 'utf8');
const saveHelper = fs.readFileSync(path.join(root, 'src/services/saveMediaToLibrary.js'), 'utf8');

test('Android does not request broad legacy or partial media-library read permissions', () => {
  const permissions = new Set(app.expo.android.permissions || []);
  for (const permission of [
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.WRITE_EXTERNAL_STORAGE',
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.READ_MEDIA_VIDEO',
    'android.permission.READ_MEDIA_AUDIO',
    'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
  ]) {
    assert.equal(permissions.has(permission), false, permission + ' must not be declared');
  }
});

test('saving media uses the write-only MediaLibrary permission API', () => {
  assert.match(saveHelper, /requestPermissionsAsync\(true,\s*\[\]\)/);
  assert.doesNotMatch(saveHelper, /requestPermissionsAsync\(\s*\)/);
  const mediaPlugin = app.expo.plugins.find((entry) => Array.isArray(entry) && entry[0] === 'expo-media-library');
  assert.ok(mediaPlugin, 'expo-media-library plugin must remain configured');
  assert.deepEqual(mediaPlugin[1].granularPermissions, []);
});

test('native release CI protects main and compiles Android native code', () => {
  assert.match(workflow, /push:[\s\S]*branches:\s*\[main, feat\/advanced-calling-live-1\.2\.241\]/);
  assert.match(workflow, /pull_request:[\s\S]*branches:\s*\[main, feat\/advanced-calling-live-1\.2\.241\]/);
  assert.match(workflow, /repository: Zanny001\/zannychat-backend/);
  assert.match(workflow, /path: zannychat-back-github/);
  assert.match(workflow, /Create non-production Firebase config for compile-only CI/);
  assert.match(workflow, /CI_ONLY_NOT_A_REAL_FIREBASE_KEY/);
  assert.match(workflow, /:app:compileDebugKotlin/);
  assert.match(workflow, /expo export --platform web/);
  assert.match(workflow, /expo export --platform android/);
  assert.match(workflow, /npm run audit:contract/);
});
test('release readiness validates the timestamped attachment cleanup claim binding', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/release_readiness.py'), 'utf8');
  assert.match(source, /cleanup_claim_migrations/);
  assert.match(source, /q\\.conversation_id/);
  assert.match(source, /conversation-prefix collisions/);
});
