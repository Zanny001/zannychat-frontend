import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync(new URL('./api.js', import.meta.url), 'utf8');
const peer = fs.readFileSync(new URL('../screens/PeerProfileScreen.js', import.meta.url), 'utf8');

test('avatar uploads always write a private copy and publish only when both visibility settings are public', () => {
  const start = api.indexOf('export async function uploadAvatar');
  const end = api.indexOf('\n}', start) + 2;
  const body = api.slice(start, end);
  assert.match(body, /from\('private-avatars'\)/);
  assert.match(body, /profile_visibility/);
  assert.match(body, /photo_visibility/);
  assert.match(body, /if \(!needsPrivate\)/);
  assert.match(body, /removeLegacyPublicAvatar/);
  assert.match(body, /avatar_url: avatarUrl/);
});

test('restricting profile or photo visibility secures legacy avatars before saving the preference', () => {
  const start = api.indexOf('async function syncAvatarVisibility');
  const end = api.indexOf('\n}', start) + 2;
  const body = api.slice(start, end);
  assert.match(body, /nextProfileVisibility !== 'everyone' \|\| nextPhotoVisibility !== 'everyone'/);
  assert.match(body, /ensurePrivateAvatarCopy/);
  assert.match(body, /removeLegacyPublicAvatar/);
  assert.ok(body.indexOf('ensurePrivateAvatarCopy') < body.indexOf('removeLegacyPublicAvatar'));
});

test('private avatar access is checked before deleting the legacy copy', () => {
  const start = api.indexOf('export async function updateMyProfileDetails');
  const end = api.indexOf('\n}', start) + 2;
  const body = api.slice(start, end);
  const privateSync = body.indexOf('if (needsPrivateAvatar)');
  const save = body.indexOf(".from('profile_details').upsert");
  const publicSync = body.indexOf('if (!needsPrivateAvatar)');
  assert.ok(privateSync >= 0 && save > privateSync && publicSync > save);
});

test('visibility changes use the server-verified RPC instead of direct table writes', () => {
  const start = api.indexOf('export async function updateMyProfileDetails');
  const end = api.indexOf('\n}', start) + 2;
  const body = api.slice(start, end);
  assert.match(body, /visibilityChanged/);
  assert.match(body, /delete rowToSave\.profile_visibility/);
  assert.match(body, /delete rowToSave\.photo_visibility/);
  assert.match(body, /rpc\('update_my_profile_visibility'/);
  assert.ok(body.indexOf('syncAvatarVisibility(authData.user.id, nextProfileVisibility, nextPhotoVisibility)') < body.indexOf("rpc('update_my_profile_visibility'"));
});

test('privacy cutover removes every legacy public avatar object, including orphaned uploads', () => {
  const start = api.indexOf('async function removeLegacyPublicAvatar');
  const end = api.indexOf('\n}', start) + 2;
  const body = api.slice(start, end);
  assert.match(body, /bucket\.list\(userId, \{ limit: 1000, offset \}\)/);
  assert.match(body, /paths\.add/);
  assert.match(body, /bucket\.remove\(allPaths\.slice\(start, start \+ 1000\)\)/);
  assert.match(body, /update\(\{ avatar_url: null \}\)/);
});

test('making a profile public restores its legacy URL for older clients', () => {
  const start = api.indexOf('async function ensureLegacyPublicAvatar');
  const end = api.indexOf('\n}', start) + 2;
  const body = api.slice(start, end);
  assert.match(body, /from\('private-avatars'\)\.download/);
  assert.match(body, /from\('avatars'\)\.upload/);
  assert.ok(body.includes(".from('profiles').update({ avatar_url: publicUrl })"));
});

test('viewer avatar resolution uses the batch authorization RPC and never falls back for restricted profiles', () => {
  const start = api.indexOf('export async function resolveProfileAvatarUrls');
  const end = api.indexOf('\n}', start) + 2;
  const body = api.slice(start, end);
  assert.match(body, /get_visible_profile_avatar_paths/);
  assert.match(body, /createSignedUrls/);
  assert.match(body, /if \(!access\?\.can_view\)/);
  assert.match(body, /access\.requires_private \? null/);
});

test('current user, chat directory, contacts, QR lookup and search resolve avatar visibility', () => {
  assert.match(api, /const \[resolved\] = await resolveProfileAvatarUrls\(\[profile\]\)/);
  assert.match(api, /const profilesWithResolvedAvatars = await resolveProfileAvatarUrls\(participantProfiles\)/);
  assert.match(api, /const resolved = await resolveProfileAvatarUrls\(Array\.isArray\(data\) \? data : \[\]\)/);
});

test('peer profile waits for viewer-authorized avatar resolution before displaying the photo', () => {
  assert.match(peer, /resolveProfileAvatarUrls\(\[\{ \.\.\.participant, id: userId \}\]\)/);
  assert.match(peer, /avatarResolutionComplete \? getSafeProfilePhotoUrl\(resolvedAvatarUrl\) : null/);
  assert.doesNotMatch(peer, /getSafeProfilePhotoUrl\(participant\.avatarUrl \|\| participant\.avatar_url\)/);
});
