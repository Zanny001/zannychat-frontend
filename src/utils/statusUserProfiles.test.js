import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('status tray profile resolution uses the privacy-aware conversation directory and avatar access RPCs', async () => {
  const service = await readFile(new URL('../services/statusUpdates.js', import.meta.url), 'utf8');
  assert.match(service, /export async function resolveStatusUserProfiles\(userIds, viewerId\)/);
  assert.match(service, /get_conversation_profile_directory/);
  assert.match(service, /get_visible_profile_avatar_paths/);
  assert.match(service, /path\?\.requires_private \? null : \(profile\.avatar_url \|\| null\)/);
  assert.match(service, /from\('private-avatars'\)/);
  assert.match(service, /createSignedUrl\(path\.avatar_path, 300\)/);
});

test('chat list story tray renders the resolved profile photo instead of a generic color avatar', async () => {
  const screen = await readFile(new URL('../screens/ChatListScreen.js', import.meta.url), 'utf8');
  assert.match(screen, /resolveStatusUserProfiles\(statuses\.map\(\(status\) => status\.user_id\), user\?\.id\)/);
  assert.match(screen, /imageUrl=\{group\.avatarUrl\}/);
  assert.match(screen, /color=\{group\.avatarColor \|\| colors\.accent\}/);
});
