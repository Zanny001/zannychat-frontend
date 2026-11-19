import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const api = readFileSync(new URL('../services/api.js', import.meta.url), 'utf8');
const screen = readFileSync(new URL('./ChatScreen.js', import.meta.url), 'utf8');
const timeline = readFileSync(new URL('../hooks/useChatTimeline.js', import.meta.url), 'utf8');

test('message history uses stable created_at and ID ordering for cursor pagination', () => {
  const start = api.indexOf('export async function fetchMessages(');
  const end = api.indexOf('\n}\n', start) + 3;
  const body = api.slice(start, end);
  assert.ok(body.includes(".order('created_at', { ascending: false })"));
  assert.ok(body.includes(".order('id', { ascending: false })"));
  assert.ok(body.includes('validateMessageCursor(before)'));
  assert.ok(body.includes('query.or('));
  assert.ok(body.includes('created_at.lt.'));
  assert.ok(body.includes('id.lt.'));
});

test('chat history passes the oldest message ID and exact timestamp to the next page', () => {
  assert.ok(timeline.includes('const oldest = messages[0]'));
  assert.ok(timeline.includes('before: { id: oldest?.id, created_at: oldest?.createdAtRaw }'));
});

test('chat FlatList has a bounded render window and preserves the visible row when older messages prepend', () => {
  assert.ok(screen.includes('initialNumToRender={12}'));
  assert.ok(screen.includes('maxToRenderPerBatch={10}'));
  assert.ok(screen.includes('updateCellsBatchingPeriod={50}'));
  assert.ok(screen.includes('windowSize={9}'));
  assert.ok(screen.includes('maintainVisibleContentPosition={{ minIndexForVisible: 1 }}'));
});
