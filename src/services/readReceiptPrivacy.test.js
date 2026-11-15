import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const api = fs.readFileSync(path.join(here, 'api.js'), 'utf8');
const exportService = fs.readFileSync(path.join(here, 'personalDataExport.js'), 'utf8');

test('chat read state is fetched through a server-side privacy projection', () => {
  assert.match(api, /rpc\('get_conversation_read_state'/);
  assert.match(api, /rpc\('get_my_read_cursors'/);
  assert.match(api, /setInterval\(poll, 5000\)/);
  assert.doesNotMatch(api, /table: 'conversation_participants'[\s\S]{0,180}last_read_at/);
});

test('chat list and personal export no longer request peers read cursors from participant rows', () => {
  assert.match(api, /conversation_participants\(user_id, is_favorite, is_muted, is_archived\)/);
  assert.match(api, /rpc\(\s*'get_conversation_profile_directory'/);
  assert.doesNotMatch(api, /conversation_participants\(user_id, profiles/);
  assert.match(exportService, /rpc\('get_my_profile'\)/);
  assert.doesNotMatch(exportService, /from\('profiles'\)\.select\('\*'\)/);
  assert.match(exportService, /rpc\('get_my_read_cursors'\)/);
  assert.doesNotMatch(exportService, /select\('[^']*last_read_at/);
});
