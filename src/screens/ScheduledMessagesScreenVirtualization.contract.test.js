import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./ScheduledMessagesScreen.js', import.meta.url), 'utf8');

test('pending scheduled messages render through a virtualized list', () => {
  assert.ok(source.includes('<FlatList'));
  assert.ok(source.includes('data={filteredItems}'));
  assert.ok(source.includes('keyExtractor='));
  assert.ok(source.includes('renderItem='));
  assert.ok(!source.includes('items.map((item) => ('));
});

test('schedule composer, handled keyboard taps and recovery states remain present', () => {
  assert.ok(source.includes('New scheduled message'));
  assert.ok(source.includes('keyboardShouldPersistTaps="handled"'));
  assert.ok(source.includes('ListEmptyComponent='));
  assert.ok(source.includes('Refresh scheduled messages'));
});

test('scheduled-message picker fetches at most 100 conversations and skips lookup for a preselected chat', () => {
  assert.ok(source.includes('fetchConversations({ limit: 100, offset: 0 })'));
  assert.ok(source.includes('initialConversationId ? Promise.resolve({ conversations: [] })'));
  assert.ok(!source.includes('limit: 1000'));
});

test('scheduled message refresh, retry and cancel actions meet 48-point mobile touch targets', () => {
  assert.ok(source.includes('accessibilityLabel="Refresh scheduled messages" style={{ width: 48, height: 48'));
  assert.ok(source.includes('accessibilityLabel="Refresh scheduled messages" style={{ minHeight: 48'));
  assert.ok(source.includes('style={{ width: 48, height: 48, alignItems: \'center\', justifyContent: \'center\' }}'));
});

test('scheduled-message library searches message text and conversation names locally', () => {
  assert.ok(source.includes("const [searchQuery, setSearchQuery] = useState('')"));
  assert.ok(source.includes('const filteredItems = items.filter'));
  assert.ok(source.includes('conversationName(item.conversation_id)'));
  assert.ok(source.includes("String(item.text || '')"));
  assert.ok(source.includes('Search scheduled messages by text or conversation'));
  assert.ok(source.includes('Clear scheduled message search'));
  assert.ok(source.includes('No matching scheduled messages'));
  assert.ok(source.includes('data={filteredItems}'));
});

test('scheduled-message search does not change scheduling, cancellation or server data access', () => {
  assert.ok(source.includes('fetchScheduledMessages(),'));
  assert.ok(source.includes('await scheduleMessage(conversationId, validateScheduledMessageText(text), iso)'));
  assert.ok(source.includes('await cancelScheduledMessage(item.id)'));
  assert.ok(source.includes('worker is configured and running'));
  assert.ok(source.includes('items.filter((row) => row.id !== item.id)'));
});
