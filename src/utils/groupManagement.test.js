import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const screen = fs.readFileSync(path.join(root, 'src/screens/GroupManagementScreen.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'src/services/api.js'), 'utf8');

test('group management exposes bounded group rename to admins', () => {
  assert.match(screen, /Group name \(80 characters\)/);
  assert.match(screen, /!groupMetadata\.name\.trim\(\)/);
  assert.match(api, /Group name must be between 1 and 80 characters/);
});

test('group management can load invite history and revoke active entries', () => {
  assert.match(api, /export async function fetchGroupInvites\(conversationId\)/);
  assert.match(screen, /Invite history/);
  assert.match(screen, /invite\.status === 'active'/);
  assert.match(screen, /revokeInvite\(invite\)/);
});


test('group management ignores stale refresh results after a newer request or screen blur', () => {
  assert.match(screen, /const refreshGeneration = useRef\(0\)/);
  assert.match(screen, /if \(requestId !== refreshGeneration\.current\) return/);
  assert.match(screen, /if \(requestId === refreshGeneration\.current\) setGroupInvites/);
  assert.match(screen, /return \(\) => \{ refreshGeneration\.current \+= 1; \}/);
});

test('group management validates invite list shape before applying refresh results', () => {
  assert.match(screen, /Array\.isArray\(invites\) \? invites : \[\]/);
});
