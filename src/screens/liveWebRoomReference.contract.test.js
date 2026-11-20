import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./LiveStreamScreen.web.js', import.meta.url), 'utf8');

test('web LIVE realtime subscriptions read the room from roomRef inside the effect', () => {
  assert.match(
    source,
    /const room = roomRef\.current;\s*if \(!room \|\| !stream\?\.id\) return undefined;/
  );
  assert.doesNotMatch(
    source,
    /\}, \[room, stream\?\.id, refreshComments\]\);/
  );
});
