import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./ScheduledMessagesScreen.js', import.meta.url), 'utf8');

test('pending scheduled messages render through a virtualized list', () => {
  assert.ok(source.includes('<FlatList'));
  assert.ok(source.includes('data={visibleItems}'));
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

test('scheduled message library searches locally by message text and conversation name', () => {
  assert.ok(source.includes("const [messageSearch, setMessageSearch] = useState('')"));
  assert.ok(source.includes('const visibleItems = useMemo'));
  assert.ok(source.includes('Search scheduled messages'));
  assert.ok(source.includes('Search messages or conversations'));
  assert.ok(source.includes('data={visibleItems}'));
  assert.ok(source.includes('{visibleItems.length} of {items.length} scheduled'));
  assert.ok(source.includes('No matching messages'));
  assert.ok(source.includes('Clear scheduled message search'));
});

test('scheduled message search preserves server-backed scheduling and cancellation operations', () => {
  assert.ok(source.includes('fetchScheduledMessages()'));
  assert.ok(source.includes('scheduleMessage(conversationId'));
  assert.ok(source.includes('cancelScheduledMessage(item.id)'));
  assert.ok(source.includes('setItems((current) => current.filter((row) => row.id !== item.id))'));
  assert.ok(source.includes('minHeight: 48, justifyContent: \'center\''));
});
