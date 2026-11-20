import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('remaining content, profile, community and authentication screens preserve all safe-area edges', () => {
  for (const name of [
  "ChatFoldersScreen.js",
  "PinnedMessagesScreen.js",
  "SharedMediaScreen.js",
  "ChatAppearanceScreen.js",
  "EditProfileScreen.js",
  "PeerProfileScreen.js",
  "JoinGroupScreen.js",
  "QRContactScreen.js",
  "ContactDiscoveryScreen.js",
  "PollsScreen.js",
  "EventsScreen.js",
  "GroupManagementScreen.js",
  "ScheduledMessagesScreen.js",
  "OnboardingScreen.js",
  "LoginScreen.js",
  "SignupScreen.js",
  "VerifyEmailScreen.js",
  "PasswordRecoveryScreen.js",
  "PasswordResetScreen.js",
  "AuthRequiredScreen.js"
]) {
    const source = readFileSync(new URL('./' + name, import.meta.url), 'utf8');
    assert.match(source, /from 'react-native-safe-area-context'/, name + ' must use safe-area-context');
    assert.match(source, /<SafeAreaView edges=\{\['top', 'left', 'right', 'bottom'\]\}/, name + ' must preserve top and home-indicator safe areas');
  }
});
