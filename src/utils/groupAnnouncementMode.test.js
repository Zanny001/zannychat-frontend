import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const screen = fs.readFileSync(path.resolve(here, '../screens/GroupManagementScreen.js'), 'utf8');
const api = fs.readFileSync(path.resolve(here, '../services/api.js'), 'utf8');

test('group management exposes a persisted admin-only announcement switch', () => {
  assert.match(screen, /Announcement mode/);
  assert.match(screen, /only group admins can send messages/);
  assert.match(screen, /Switch value=\{Boolean\(groupMetadata\.adminOnlyMessages\)\}/);
  assert.match(api, /updateGroupMetadata\(conversationId, \{ name, topic, description, adminOnlyMessages \}\)/);
  assert.match(api, /typeof adminOnlyMessages === 'boolean'/);
});

test('saving group metadata preserves the announcement setting when the API omits it', () => {
  assert.match(screen, /adminOnlyMessages: typeof saved\.adminOnlyMessages === 'boolean' \? saved\.adminOnlyMessages : Boolean\(groupMetadata\.adminOnlyMessages\)/);
  assert.match(screen, /group name, topic, description, and announcement setting have been updated/);
});
