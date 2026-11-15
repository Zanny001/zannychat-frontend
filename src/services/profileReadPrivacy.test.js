import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const api = fs.readFileSync(path.join(here, 'api.js'), 'utf8');
const exportService = fs.readFileSync(path.join(here, 'personalDataExport.js'), 'utf8');

test('owner profile reads use the owner-only RPC rather than direct wildcard table reads', () => {
  const start = api.indexOf('export async function getCurrentUser');
  const end = api.indexOf('// Edits made in mock mode', start);
  const body = api.slice(start, end);
  assert.ok(body.includes("rpc('get_my_profile')"));
  assert.equal(body.includes(".from('profiles')"), false);
});

test('profile edits do not request a private full-row SELECT after UPDATE', () => {
  const start = api.indexOf('export async function updateProfile');
  const end = api.indexOf('const PROFILE_DETAIL_DEFAULTS', start);
  const body = api.slice(start, end);
  assert.ok(body.includes('const savedProfile = await getCurrentUser()'));
  assert.ok(body.includes('savedProfile?.username'));
  assert.ok(body.includes('could not be confirmed as saved'));
  assert.equal(body.includes('.select('), false);
});

test('conversation participant profile details are fetched through the relationship-scoped RPC', () => {
  const start = api.indexOf('export async function fetchConversations');
  const end = api.indexOf('// Removes the current user', start);
  const body = api.slice(start, end);
  assert.equal(body.includes('profiles(id, name'), false);
  assert.ok(body.includes("'get_conversation_profile_directory'"));
});

test('personal data export reads the full profile through the owner-only RPC', () => {
  assert.ok(exportService.includes("supabase.rpc('get_my_profile')"));
  assert.equal(exportService.includes("from('profiles').select('*')"), false);
});
