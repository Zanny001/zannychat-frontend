import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateGroupMetadata } from './groupMetadataValidation.js';

const screen = fs.readFileSync(new URL('../screens/GroupManagementScreen.js', import.meta.url), 'utf8');

test('group metadata trims whitespace and preserves announcement setting', () => {
  assert.deepEqual(validateGroupMetadata({ name: '  Study group  ', topic: ' weekly plans ', description: '  Welcome!  ', adminOnlyMessages: true }), {
    ok: true,
    errors: [],
    value: { name: 'Study group', topic: 'weekly plans', description: 'Welcome!', adminOnlyMessages: true },
  });
});

test('group metadata rejects missing names and overlong fields', () => {
  assert.equal(validateGroupMetadata({ name: '   ' }).ok, false);
  assert.match(validateGroupMetadata({ name: 'x'.repeat(81) }).errors.join(' '), /80 characters/);
  assert.match(validateGroupMetadata({ name: 'Valid', topic: 'x'.repeat(81) }).errors.join(' '), /topic/);
  assert.match(validateGroupMetadata({ name: 'Valid', description: 'x'.repeat(501) }).errors.join(' '), /description/);
});

test('group metadata rejects unsupported control characters but permits normal multiline descriptions', () => {
  assert.equal(validateGroupMetadata({ name: 'Group\u0007' }).ok, false);
  assert.equal(validateGroupMetadata({ name: 'Group', description: 'Line one\nLine two\tDetails' }).ok, true);
});

test('group management validates and saves normalized metadata instead of raw form values', () => {
  assert.match(screen, /validateGroupMetadata\(groupMetadata\)/);
  assert.match(screen, /updateGroupMetadata\(conversationId, validation\.value\)/);
  assert.match(screen, /Group details need attention/);
});
