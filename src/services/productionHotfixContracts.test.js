import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('chat list embeds messages through the explicit conversation foreign key', () => {
  const source = read('src/services/api.js');
  assert.match(source, /messages!messages_conversation_id_fkey\(sender_id, text, created_at, media_type\)/);
});

test('native caller can initialize media while the call is still ringing', () => {
  const source = read('src/screens/CallScreen.js');
  assert.match(source, /isCaller \? !\['ringing', 'accepted'\]\.includes\(liveCall\.status\) : liveCall\.status !== 'accepted'/);
});

test('web caller can initialize media while the call is still ringing', () => {
  const source = read('src/screens/CallScreen.web.js');
  assert.match(source, /isCaller \? !\['ringing', 'accepted'\]\.includes\(liveCall\.status\) : liveCall\.status !== 'accepted'/);
});
