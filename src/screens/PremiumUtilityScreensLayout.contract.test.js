import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');

test('Call history refresh, audio redial, video redial and delete actions use balanced 48-point controls', () => {
  const source = read('CallHistoryScreen.js');
  assert.match(source, /width: 48, height: 48, borderRadius: 15/);
  assert.equal((source.match(/width: 48, height: 48/g) || []).length >= 4, true);
  assert.match(source, /accessibilityLabel=\{'Call ' \+ \(item\.participantName/);
  assert.match(source, /accessibilityLabel=\{'Video call ' \+ \(item\.participantName/);
  assert.match(source, /accessibilityLabel=\{'Delete call record with ' \+ \(item\.participantName/);
});

test('Contact discovery, group creation and group management actions use 48-point sizing', () => {
  assert.match(read('ContactDiscoveryScreen.js'), /minHeight: 48/);
  assert.match(read('CreateGroupScreen.js'), /minHeight: 48/);
  assert.match(read('GroupManagementScreen.js'), /actionStyle = \{ minHeight: 48/);
});

test('Join group, creator profile, notifications and scheduled message actions use 48-point sizing', () => {
  assert.match(read('JoinGroupScreen.js'), /minHeight: 48/);
  assert.match(read('LiveCreatorProfileScreen.js'), /minHeight: 48/);
  assert.match(read('NotificationsScreen.js'), /timeInput: \{ minHeight: 48/);
  assert.match(read('ScheduledMessagesScreen.js'), /minHeight: 48, borderRadius: radii\.md/);
});

test('Shared touch-target contract counts 44-point and larger controls', () => {
  assert.match(read('ThemeContrast.contract.test.js'), /Number\(match\[1\]\) >= 44/);
});

test('Settings accessibility, connection and logout actions retain 48-point targets', () => {
  const source = read('SettingsScreen.js');
  assert.match(source, /accessibilityLabel="Re-check connections"[\s\S]*?minWidth: 48, minHeight: 48/);
  assert.match(source, /accessibilitySwitchRow: \{ minHeight: 48/);
  assert.match(source, /logoutBtn: \{ minHeight: 48/);
});
