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
  assert.match(workflow, /zannychat-android-compile-only-not-for-install/);
  assert.match(workflow, /not installable for QA/i);
  assert.doesNotMatch(workflow, /Upload Android debug APK for physical-device QA/);
  assert.match(workflow, /:app:compileDebugKotlin/);
  assert.match(workflow, /expo export --platform web/);
  assert.match(workflow, /expo export --platform android/);
  assert.match(workflow, /npm run audit:contract/);
});

test('startup cannot remain on the native splash when session restore stalls', () => {
  const source = fs.readFileSync(path.join(root, 'App.js'), 'utf8');
  assert.match(source, /Promise\.race\(\[/);
  assert.match(source, /Session restoration timed out after 8 seconds/);
  assert.match(source, /clearTimeout\(sessionTimeout\)/);
  assert.match(source, /if \(mounted && !authStateObserved\)/);
});

test('font loading errors fall back to system fonts instead of blocking app readiness', () => {
  const source = fs.readFileSync(path.join(root, 'App.js'), 'utf8');
  assert.match(source, /const \[fontsLoaded, fontError\] = useAppFonts\(\)/);
  assert.match(source, /\(fontsLoaded \|\| Boolean\(fontError\)\) && initialRoute !== null/);
});


test('startup has a hard deadline fallback for unexpected font or auth initialization stalls', () => {
  const source = fs.readFileSync(path.join(root, 'App.js'), 'utf8');
  assert.match(source, /startupDeadlineReached/);
  assert.match(source, /setTimeout\(\(\) => \{/);
  assert.match(source, /startup exceeded 12 seconds/i);
  assert.match(source, /setInitialRoute\(\(currentRoute\) => currentRoute \|\| 'Onboarding'\)/);
  assert.match(source, /Boolean\(fontError\) \|\| startupDeadlineReached/);
  assert.match(source, /clearTimeout\(startupDeadline\)/);
});


test('Android release has an explicit positive version code', () => {
  assert.equal(app.expo.android.package, 'com.zannychat.app');
  assert.ok(Number.isInteger(app.expo.android.versionCode));
  assert.ok(app.expo.android.versionCode > 0);
});


test('production Android build requires real Firebase and Expo credentials and never auto-submits', () => {
  const releaseWorkflow = fs.readFileSync(path.join(root, '.github/workflows/android-production-build.yml'), 'utf8');
  assert.match(releaseWorkflow, /workflow_dispatch/);
  assert.match(releaseWorkflow, /secrets\.EXPO_TOKEN/);
  assert.match(releaseWorkflow, /secrets\.GOOGLE_SERVICES_JSON_BASE64/);
  assert.match(releaseWorkflow, /Firebase config is not a valid production config/);
  assert.match(releaseWorkflow, /--profile production/);
  assert.doesNotMatch(releaseWorkflow, /--auto-submit|build:submit|submit --platform/i);
  assert.match(releaseWorkflow, /confirm_release/);
});
