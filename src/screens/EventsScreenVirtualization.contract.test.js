import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./EventsScreen.js', import.meta.url), 'utf8');
const service = readFileSync(new URL('../services/events.js', import.meta.url), 'utf8');

test('upcoming events render in a virtualized list with stable event IDs', () => {
  assert.ok(source.includes('<FlatList'));
  assert.ok(source.includes('data={visibleEvents}'));
  assert.ok(source.includes('keyExtractor='));
  assert.ok(source.includes('renderItem='));
});

test('event creation remains in the list header and preserves RSVP actions', () => {
  assert.ok(source.includes('ListHeaderComponent='));
  assert.ok(source.includes('Create a shared moment'));
  assert.ok(source.includes('respondToConversationEvent'));
  assert.ok(source.includes('ListEmptyComponent='));
});

test('event list uses bounded cursor pages and exposes load more', () => {
  assert.ok(source.includes('ListFooterComponent='));
  assert.ok(source.includes('listConversationEventPage(conversationId, { cursor: nextCursor })'));
  assert.ok(source.includes('Load more upcoming events'));
  assert.ok(service.includes('.range(0, limit)'));
  assert.ok(service.includes('validateEventCursor(cursor)'));
});

test('conversation events use a premium shared-moments composer and scannable event cards', () => {
  assert.match(source, /eyebrow="MAKE IT A MOMENT"/);
  assert.match(source, /Create a shared moment/);
  assert.match(source, /EVENT NAME/);
  assert.match(source, /DATE & TIME · YOUR LOCAL TIME/);
  assert.match(source, /Coming together/);
  assert.match(source, /eventDate\.toLocaleTimeString/);
  assert.match(source, /YOUR RESPONSE/);
  assert.match(source, /accessibilityState=\{\{ selected: mine === option\.value \}\}/);
});

test('conversation events support local search across title, location and description', () => {
  assert.ok(source.includes("const [searchQuery, setSearchQuery] = useState('')"));
  assert.ok(source.includes('const visibleEvents = events.filter'));
  assert.ok(source.includes('[event.title, event.location, event.description]'));
  assert.ok(source.includes('Search loaded events'));
  assert.ok(source.includes('Search loaded events by title, location or details'));
  assert.ok(source.includes('Clear event search'));
  assert.ok(source.includes('No matching loaded events'));
  assert.ok(source.includes('data={visibleEvents}'));
});

test('event search remains local to loaded cursor pages and preserves RSVP and pagination', () => {
  assert.ok(source.includes('listConversationEventPage(conversationId, { cursor: nextCursor })'));
  assert.ok(source.includes('Search updates as you load more'));
  assert.ok(source.includes('respondToConversationEvent(event.id, response)'));
  assert.ok(source.includes('Load more upcoming events'));
  assert.ok(service.includes('listConversationEventPage'));
});
