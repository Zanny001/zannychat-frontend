import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('status replies use bounded newest-first cursor pages and return chronological rows', async () => {
  const source = await readFile(new URL('../services/statusUpdates.js', import.meta.url), 'utf8');
  assert.match(source, /listStatusReplies\(statusId, \{ before = null, limit = 30 \} = \{\}\)/);
  assert.match(source, /Math\.min\(limit, 50\)/);
  assert.match(source, /order\('created_at', \{ ascending: false \}\)\.limit\(pageSize \+ 1\)/);
  assert.match(source, /query\.lt\('created_at', cursorDate\.toISOString\(\)\)/);
  assert.match(source, /newestFirst\.slice\(0, pageSize\)\.reverse\(\)/);
  assert.match(source, /return \{ rows: page, hasMore, nextBefore: page\[0\]\?\.created_at \|\| null \}/);
});

test('status owner UI can load older private replies without duplicate concurrent pages', async () => {
  const source = await readFile(new URL('../screens/StatusUpdatesScreen.js', import.meta.url), 'utf8');
  assert.match(source, /replyPageLockRef\.current/);
  assert.match(source, /listStatusReplies\(viewing\.id, \{ before: replyCursor \}\)/);
  assert.match(source, /setReplies\(\(old\) => \[\.\.\.page\.rows, \.\.\.old\]\)/);
  assert.match(source, /Load older private status replies/);
  assert.match(source, /loadingOlderReplies \? 'Loading older replies…' : 'Load older replies'/);
});
