import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');

test('Channels feed and directory actions use comfortable 48-point targets', () => {
  const source = read('ChannelsScreen.js');
  assert.match(source, /buttonStyle = \(disabled = false\) => \(\{ minHeight: 48/);
  assert.match(source, /minHeight: 48,\s*minWidth: 48/);
  assert.match(source, /accessibilityLabel="Delete channel post" style=\{\{ minWidth: 48, minHeight: 48/);
  assert.match(source, /accessibilityLabel="Refresh channels" style=\{\{ minHeight: 48/);
  assert.match(source, /minHeight: 48, borderRadius: radii\.lg, paddingHorizontal: spacing\.md/);
});

test('Status publishing, audience, viewer and moderation controls use 48-point targets', () => {
  const source = read('StatusUpdatesScreen.js');
  assert.match(source, /minHeight: 48/);
  assert.match(source, /minWidth: 48/);
  assert.match(source, /accessibilityLabel="Delete status" hitSlop=\{10\} style=\{\{ minWidth: 48, minHeight: 48/);
  assert.match(source, /accessibilityLabel="Mute this account’s statuses" hitSlop=\{10\} style=\{\{ minWidth: 48, minHeight: 48/);
  assert.match(source, /accessibilityLabel="Send status reply" style=\{\{ minWidth: 48, minHeight: 48/);
  assert.match(source, /accessibilityLabel="Close status privacy settings" style=\{\{ minWidth: 48, minHeight: 48/);
});

test('Status and channel touch-target regression contract accepts 44 points or larger', () => {
  const source = read('ThemeContrast.contract.test.js');
  assert.match(source, /Number\(match\[1\]\) >= 44/);
});
