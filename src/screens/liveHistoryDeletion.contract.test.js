import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const calls = read('src/services/calls.js');
const callHistory = read('src/screens/CallHistoryScreen.js');
const newChat = read('src/screens/NewChatScreen.js');
const liveHub = read('src/screens/LiveHubScreen.js');
const creator = read('src/screens/LiveCreatorProfileScreen.js');
const replay = read('src/screens/LiveReplayScreen.js');
const api = read('src/services/api.js');
const editProfile = read('src/screens/EditProfileScreen.js');

test('call history supports per-user deletion without deleting shared call rows', () => {
  assert.match(calls, /hideCallHistory/);
  assert.match(calls, /\/calls\/history\/hidden/);
  assert.match(callHistory, /removeCall\(item\)/);
  assert.match(callHistory, /Delete call record\?/);
});

test('past direct calls can be redialed as audio or video from the saved participant', () => {
  assert.match(callHistory, /peerUserId = item\.direction === 'incoming' \? item\.caller_id : item\.callee_id/);
  assert.match(callHistory, /redialCall\(item, peerUserId, 'audio'\)/);
  assert.match(callHistory, /redialCall\(item, peerUserId, 'video'\)/);
  assert.match(callHistory, /navigation\.navigate\('GroupCall'/);
  assert.match(newChat, /targetUserId/);
  assert.match(newChat, /autoStartedCallRef/);
  assert.match(newChat, /startChat\(target\)/);
});

test('LIVE creators can delete replays and ended broadcasts from their management screens', () => {
  assert.match(liveHub, /Delete LIVE replay\?/);
  assert.match(liveHub, /item\.creatorId === currentUserId/);
  assert.match(creator, /Delete past LIVE broadcast\?/);
  assert.match(creator, /method: 'DELETE'/);
  assert.match(creator, /Delete LIVE replay\?/);
  assert.match(replay, /Delete this LIVE replay/);
});

test('profile username save re-reads through the owner-only RPC and updates the editor state', () => {
  const updateStart = api.indexOf('export async function updateProfile');
  const updateEnd = api.indexOf('const PROFILE_DETAIL_DEFAULTS', updateStart);
  const updateBody = api.slice(updateStart, updateEnd);
  assert.ok(updateBody.includes('return getCurrentUser()'));
  assert.equal(updateBody.includes('.select('), false);
  assert.ok(api.includes("rpc('get_my_profile')"));
  assert.match(editProfile, /const savedProfile = await updateProfile/);
  assert.match(editProfile, /setUsername\(savedProfile\?\.username/);
});
