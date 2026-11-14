import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, 'LiveStreamScreen.js'), 'utf8');

test('LIVE creator stage controls expose direct guest invitation, microphone mute, and removal', () => {
  assert.ok(source.includes('/guests/invite'));
  assert.ok(source.includes('/guests/'));
  assert.ok(source.includes('/mute'));
  assert.ok(source.includes('Invite to stage'));
  assert.ok(source.includes('Mute mic'));
  assert.ok(source.includes('Remove guest'));
});

test('LIVE stage actions are accessible and destructive guest removal requires confirmation', () => {
  assert.ok(source.includes('accessibilityLabel={item.microphoneMuted ?'));
  assert.ok(source.includes("Alert.alert('Remove guest from stage?'"));
  assert.ok(source.includes("style: 'destructive'"));
});

test('stage panel shows the enforced guest capacity and retains moderator management', () => {
  assert.ok(source.includes('up to 5 guests'));
  assert.ok(source.includes('onSetModerator'));
});

test('web LIVE creator stage manager has parity with native guest controls', () => {
  const webSource = fs.readFileSync(path.join(here, 'LiveStreamScreen.web.js'), 'utf8');
  assert.ok(webSource.includes('/guests/invite'));
  assert.ok(webSource.includes('/mute'));
  assert.ok(webSource.includes('Manage LIVE stage'));
  assert.ok(webSource.includes('Remove guest'));
  assert.ok(webSource.includes('up to 5 guests'));
});
