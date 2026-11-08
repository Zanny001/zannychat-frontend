import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync(new URL('./api.js', import.meta.url), 'utf8');

test('avatar uploads dual-write private and legacy objects before profile pointer update', () => {
  const privateWrite = api.indexOf(".from('private-avatars')", api.indexOf('export async function uploadAvatar'));
  const legacyWrite = api.indexOf(".from('avatars')", privateWrite);
  const detailsWrite = api.indexOf(".from('profile_details')", legacyWrite);
  const legacyPointer = api.indexOf(".from('profiles').update({ avatar_url: avatarUrl })", detailsWrite);
  assert.ok(privateWrite >= 0 && legacyWrite > privateWrite && detailsWrite > legacyWrite && legacyPointer > detailsWrite);
});

test('private avatar signed URL lookup uses server authorization and validates owner-prefixed paths', () => {
  const start = api.indexOf('export async function getPrivateProfileAvatarUrl');
  const body = api.slice(start, api.indexOf('\n}', start) + 2);
  assert.match(body, /get_visible_profile_avatar_path/);
  assert.match(body, /startsWith\(`\$\{userId\}\/`\)/);
  assert.match(body, /createSignedUrl/);
  assert.doesNotMatch(body, /getPublicUrl/);
});
