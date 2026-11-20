import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wideScreens = [
  'ProfileScreen.js',
  'PeerProfileScreen.js',
  'EditProfileScreen.js',
  'PrivacySecurityScreen.js',
  'NotificationsScreen.js',
  'HelpScreen.js',
  'DataStorageScreen.js',
  'DataExportScreen.js',
  'SessionsScreen.js',
  'ContactDiscoveryScreen.js',
];

test('profile, settings and account-support surfaces use the shared centered content width', () => {
  for (const file of wideScreens) {
    const source = readFileSync(new URL('./' + file, import.meta.url), 'utf8');
    assert.match(source, /layout\.contentMaxWidth/, file + ' must use the shared content measure');
    assert.match(source, /maxWidth: layout\.contentMaxWidth/, file + ' must cap wide-screen content');
    assert.match(source, /alignSelf: 'center'/, file + ' must center its content column');
  }
});

test('QR contact flow uses the narrower shared form measure', () => {
  const source = readFileSync(new URL('./QRContactScreen.js', import.meta.url), 'utf8');
  assert.match(source, /layout\.formMaxWidth/);
  assert.match(source, /maxWidth: layout\.formMaxWidth/);
  assert.match(source, /alignSelf: 'center'/);
});
