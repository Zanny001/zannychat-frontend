import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('secondary stack screens preserve all device safe-area edges', () => {
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
    assert.match(source, /<SafeAreaView edges=\{\['top', 'left', 'right', 'bottom'\]\}/, name + ' must preserve top and home-indicator safe areas');
  }
});
