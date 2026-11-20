import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const component = (name) => readFileSync(new URL(`../components/${name}.js`, import.meta.url), 'utf8');

test('shared glass chrome keeps a non-blur fallback on older Android versions', () => {
  for (const name of ['Header', 'InputBar', 'ActionSheet']) {
    const source = component(name);
    assert.ok(source.includes("supportsBackdropBlur = Platform.OS !== 'android' || Number(Platform.Version) >= 31"), `${name} should avoid unsupported Android blur`);
    assert.ok(source.includes('supportsBackdropBlur ? ('), `${name} should render blur conditionally`);
  }
});

test('shared glass chrome follows the selected light or dark appearance', () => {
  for (const name of ['Header', 'InputBar', 'ActionSheet']) {
    assert.ok(component(name).includes('tint={resolvedMode}'), `${name} blur tint should follow the active appearance`);
  }
  assert.ok(!component('ActionSheet').includes('tint="dark"'), 'ActionSheet must not force dark blur in light mode');
});

test('action sheet content clears the device bottom safe area', () => {
  const source = component('ActionSheet');
  assert.ok(source.includes('useSafeAreaInsets'));
  assert.ok(source.includes('paddingBottom: Math.max(28, insets.bottom + 16)'));
});


test('secondary app screens use explicit device-safe top and horizontal insets', () => {
  for (const name of [
    'NotificationsScreen.js',
    'DataStorageScreen.js',
    'SessionsScreen.js',
    'HelpScreen.js',
    'PrivacySecurityScreen.js',
    'NewChatScreen.js',
    'CreateGroupScreen.js',
    'ForwardMessageScreen.js',
    'DraftsScreen.js',
    'SavedMessagesScreen.js',
  ]) {
    const source = readFileSync(new URL('./' + name, import.meta.url), 'utf8');
    assert.match(source, /from 'react-native-safe-area-context'/, name + ' must use safe-area-context');
    assert.match(source, /<SafeAreaView edges=\{\['top', 'left', 'right'\]\}/, name + ' must preserve existing bottom content spacing');
  }
});
