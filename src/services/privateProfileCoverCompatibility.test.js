import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync(new URL('./api.js', import.meta.url), 'utf8');
const editor = fs.readFileSync(new URL('../screens/EditProfileScreen.js', import.meta.url), 'utf8');
const peer = fs.readFileSync(new URL('../screens/PeerProfileScreen.js', import.meta.url), 'utf8');

test('cover upload writes only to private storage and returns path plus temporary signed URL', () => {
  const start = api.indexOf('export async function uploadProfileCover');
  const end = api.indexOf('\n}', start) + 2;
  const body = api.slice(start, end);
  assert.match(body, /\.from\('private-avatars'\)\s*\.upload/);
  assert.match(body, /createSignedUrl/);
  assert.doesNotMatch(body, /\.from\('avatars'\)|getPublicUrl/);
  assert.match(body, /return \{ path: objectPath, url:/);
});

test('profile details persist cover_path but never persist the transient signed URL', () => {
  const start = api.indexOf('export async function updateMyProfileDetails');
  const end = api.indexOf('\n}', start) + 2;
  const body = api.slice(start, end);
  assert.match(body, /filter\(\(key\) => key !== 'cover_image_url'\)/);
  assert.match(body, /cover_path/);
});

test('cover URL lookup uses visibility-aware RPC and validates owner-prefixed path', () => {
  const start = api.indexOf('export async function getPrivateProfileCoverUrl');
  const end = api.indexOf('\n}', start) + 2;
  const body = api.slice(start, end);
  assert.match(body, /get_visible_profile_cover_path/);
  assert.match(body, /startsWith\(`\$\{userId\}\/`\)/);
  assert.match(body, /createSignedUrl/);
  assert.doesNotMatch(body, /getPublicUrl/);
});

test('editor saves private cover path and peer profile resolves an authorized cover', () => {
  assert.match(editor, /setDetail\('cover_path', cover\.path\)/);
  assert.match(peer, /getPrivateProfileCoverUrl\(userId\)/);
  assert.match(peer, /coverBackdrop/);
});
