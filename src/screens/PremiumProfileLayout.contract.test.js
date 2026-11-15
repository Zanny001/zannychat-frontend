import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');

test('Own profile actions use comfortable minimum sizing', () => {
  const source = read('ProfileScreen.js');
  assert.match(source, /minHeight: 48, justifyContent: 'center'/);
  assert.match(source, /profileAction: \{ minHeight: 48/);
});

test('Profile editing save, preview and preview-dismiss actions have 48-point targets', () => {
  const source = read('EditProfileScreen.js');
  assert.match(source, /accessibilityLabel="Save profile"[^>]*style=\{\{ minWidth: 48, minHeight: 48/);
  assert.match(source, /accessibilityLabel="Preview your profile" style=\{\{ minHeight: 48/);
  assert.match(source, /accessibilityLabel="Close profile preview" style=\{\{ minWidth: 48, minHeight: 48/);
});

test('Peer profile full-size photo viewer close control remains easy to hit', () => {
  const source = read('PeerProfileScreen.js');
  assert.match(source, /photoViewerClose: \{ width: 48, height: 48, minWidth: 48, minHeight: 48/);
});
