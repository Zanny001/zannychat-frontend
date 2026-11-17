import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL('./' + name, import.meta.url), 'utf8');
const drafts = read('DraftsScreen.js');
const saved = read('SavedMessagesScreen.js');
const pinned = read('PinnedMessagesScreen.js');
const forward = read('ForwardMessageScreen.js');
const folders = read('ChatFoldersScreen.js');

test('draft screen skips unnecessary conversation lookup and caps required lookup at 100', () => {
  assert.ok(drafts.includes('if (items.length)'));
  assert.ok(drafts.includes('fetchConversations({ limit: 100, offset: 0 })'));
  assert.ok(!drafts.includes('limit: 1000'));
  assert.ok(drafts.includes('new Map(conversations.map((item) => [item.id, item]))'));
  assert.ok(drafts.includes('conversationsById.get(draft.conversationId)'));
  assert.ok(!drafts.includes('conversations.find('));
});

test('saved, pinned, forward and folder collections use bounded FlatList render windows', () => {
  for (const [name, source] of [['saved', saved], ['pinned', pinned], ['forward', forward], ['folders', folders]]) {
    assert.ok(source.includes('<FlatList'), name + ' must use FlatList');
    assert.ok(source.includes('initialNumToRender='), name + ' must bound initial rendering');
    assert.ok(source.includes('maxToRenderPerBatch='), name + ' must bound each render batch');
    assert.ok(source.includes('windowSize='), name + ' must bound the retained render window');
  }
});

test('saved and pinned content remains device-local and opens the original message', () => {
  assert.ok(saved.includes('Your private, on-device collection'));
  assert.ok(saved.includes('navigation.navigate(\\'Chat\\''));
  assert.ok(pinned.includes('navigation.navigate(\\'Chat\\''));
  assert.ok(pinned.includes('Open original message'));
});
