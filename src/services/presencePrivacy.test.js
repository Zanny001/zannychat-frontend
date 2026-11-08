import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, 'presence.js'), 'utf8');

test('presence uses authenticated server projection instead of a globally enumerable Realtime channel', () => {
  assert.match(source, /rpc\('get_visible_presence'/);
  assert.match(source, /rpc\('heartbeat_presence'/);
  assert.doesNotMatch(source, /presence:global/);
  assert.doesNotMatch(source, /presenceState\(/);
});

test('presence heartbeats are bounded and app backgrounding marks the user inactive', () => {
  assert.match(source, /setInterval\([\s\S]*30000\)/);
  assert.match(source, /AppState\.addEventListener\('change'/);
  assert.match(source, /heartbeat\(false\)/);
});
