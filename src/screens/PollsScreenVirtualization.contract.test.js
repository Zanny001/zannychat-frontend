import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./PollsScreen.js', import.meta.url), 'utf8');

test('conversation polls use a virtualized list with stable keys', () => {
  assert.ok(source.includes('<FlatList'));
  assert.ok(source.includes('data={polls}'));
  assert.ok(source.includes('keyExtractor='));
  assert.ok(source.includes('renderItem='));
  assert.ok(!source.includes('polls.map((poll) => {'));
});

test('poll creation form remains the list header and keyboard taps remain handled', () => {
  assert.ok(source.includes('ListHeaderComponent='));
  assert.ok(source.includes('Create a poll'));
  assert.ok(source.includes('keyboardShouldPersistTaps="handled"'));
});

test('cursor pagination and load-older state remain attached to the list footer', () => {
  assert.ok(source.includes('ListFooterComponent='));
  assert.ok(source.includes('listConversationPollPage(conversationId, { cursor: nextCursor })'));
  assert.ok(source.includes('Load older polls'));
  assert.ok(source.includes('ListEmptyComponent='));
});

test('polls have a distinct participation header context', () => {
  assert.ok(source.includes('YOUR VOICE COUNTS'));
});
