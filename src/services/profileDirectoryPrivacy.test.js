import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, 'api.js'), 'utf8');

test('QR profile lookup uses the dedicated public-profile lookup RPC, not the shared-conversation directory', () => {
  const start = source.indexOf('export async function fetchContactById');
  const end = source.indexOf('// Private phone discovery', start);
  const body = source.slice(start, end);
  assert.match(body, /rpc\('get_public_profile_by_id', \{ p_user_id: userId \}\)/);
  assert.doesNotMatch(body, /from\('profiles'\)/);
  assert.match(body, /profile is private, unavailable, or not discoverable/);
});

test('contact directory uses the privacy-aware discovery RPC', () => {
  const start = source.indexOf('export async function fetchContacts');
  const end = source.indexOf('// Paginated since', start);
  const body = source.slice(start, end);
  assert.match(body, /rpc\('get_contact_directory'\)/);
  assert.doesNotMatch(body, /from\('profiles'\)/);
});
