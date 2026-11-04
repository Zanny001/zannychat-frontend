import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = await readFile(resolve(here, '../screens/ChatListScreen.js'), 'utf8');

test('optimistic chat flag actions roll back when persistence fails', () => {
  assert.match(source, /catch \(error\) \{\s*\/\/ Roll back only the field involved/);
  assert.match(source, /patchConversation\(conversation\.id, \{ \[field\]: previousValue \}\)/);
  assert.match(source, /setConversationActionError\(`Couldn't save/);
});

test('chat flag writes serialize per conversation and field', () => {
  assert.match(source, /const actionKey = `\$\{conversation\.id\}:\$\{field\}`/);
  assert.match(source, /if \(pendingConversationActions\.current\.has\(actionKey\)\) return/);
  assert.match(source, /pendingConversationActions\.current\.delete\(actionKey\)/);
});

test('failed chat actions expose an accessible dismissible error', () => {
  assert.match(source, /accessibilityRole="alert" style=\{\[typography\.caption/);
  assert.match(source, /accessibilityLabel="Dismiss chat action error"/);
});
