import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./EditProfileScreen.js', import.meta.url), 'utf8');

test('edit profile opens with a Crown Aurora identity overview and live profile strength', () => {
  assert.ok(source.includes('YOUR ZANNYCHAT IDENTITY'));
  assert.ok(source.includes('Profile strength'));
  assert.ok(source.includes('Profile identity.'));
  assert.ok(source.includes('{profileCompletion}%'));
  assert.ok(source.includes('A complete profile helps people recognize and connect with you.'));
  assert.ok(source.includes('avatarPreviewUri || avatarUrl'));
});

test('identity overview preserves existing profile save, privacy and preview flows', () => {
  assert.ok(source.includes('updateProfile({ name: name.trim(), status: status.trim(), username: normalizedUsername })'));
  assert.ok(source.includes('updateMyProfileDetails({ ...details, birthday: details.birthday || null })'));
  assert.ok(source.includes('Preview your profile'));
  assert.ok(source.includes('Who can view your profile'));
  assert.ok(source.includes('Contact and audience permissions'));
  assert.ok(source.includes('Profile saved'));
});
