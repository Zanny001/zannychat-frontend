import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '..');
const api = fs.readFileSync(path.join(src, 'services/api.js'), 'utf8');
const newChat = fs.readFileSync(path.join(src, 'screens/NewChatScreen.js'), 'utf8');
const editProfile = fs.readFileSync(path.join(src, 'screens/EditProfileScreen.js'), 'utf8');
const signup = fs.readFileSync(path.join(src, 'screens/SignupScreen.js'), 'utf8');

test('server-backed people search calls the privacy-aware search_people RPC', () => {
  const start = api.indexOf('export async function searchPeople');
  const end = api.indexOf('// Paginated since', start);
  const body = api.slice(start, end);
  assert.match(body, /rpc\('search_people'/);
  assert.match(body, /cleanQuery\.length < 2/);
  assert.match(body, /Math\.min\([^;]*25/);
  assert.doesNotMatch(body, /from\('profiles'\)/);
});

test('New Chat searches registered members by display name or @username', () => {
  assert.match(newChat, /searchPeople\(query, 20\)/);
  assert.match(newChat, /Search names or @username/);
  assert.match(newChat, /@\{item\.username\}/);
});

test('email and Google registration receive an automatically generated username from the Auth profile trigger', () => {
  assert.match(signup, /unique @username is created automatically/i);
  assert.match(api, /options: \{ data: \{ name \} \}/);
});

test('profile editing requires a valid normalized username', () => {
  assert.match(editProfile, /normalizeUsername\(username\)/);
  assert.match(editProfile, /isValidUsername\(normalizedUsername\)/);
  assert.match(editProfile, /Username required/);
});
