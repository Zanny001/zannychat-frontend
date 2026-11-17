import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL('./' + name, import.meta.url), 'utf8');

const collections = [
  ['SavedMessagesScreen.js', 'saved messages'],
  ['DraftsScreen.js', 'drafts'],
  ['PinnedMessagesScreen.js', 'pinned messages'],
  ['ChatFoldersScreen.js', 'chat folders'],
  ['SharedMediaScreen.js', 'shared media'],
];

test('large message collections use virtualized FlatList rendering', () => {
  for (const [file, label] of collections) {
    const source = read(file);
    assert.match(source, /<FlatList\b/, label + ' must use FlatList');
    assert.doesNotMatch(source, /<ScrollView\b/, label + ' must not map an unbounded collection inside ScrollView');
    assert.match(source, /keyExtractor=/, label + ' must have stable item keys');
    assert.match(source, /renderItem=/, label + ' must render items through FlatList');
  }
});

test('saved and pinned collection filtering remains memoized and empty states remain present', () => {
  const saved = read('SavedMessagesScreen.js');
  const pinned = read('PinnedMessagesScreen.js');
  assert.match(saved, /filterSavedMessages\(items, query\)/);
  assert.match(pinned, /filterPinnedMessages\(items, query, conversation\?\.id\)/);
  assert.match(saved, /ListEmptyComponent=/);
  assert.match(pinned, /ListEmptyComponent=/);
});

test('drafts retain header, empty, and recoverable error states in the virtualized list', () => {
  const drafts = read('DraftsScreen.js');
  assert.match(drafts, /ListHeaderComponent=/);
  assert.match(drafts, /ListEmptyComponent=/);
  assert.match(drafts, /Retry loading drafts/);
});

test('shared media retains bounded pagination and virtualizes each media tab', () => {
  const shared = read('SharedMediaScreen.js');
  assert.match(shared, /const PAGE_SIZE = 30/);
  assert.match(shared, /const MAX_PAGES_PER_LOAD = 6/);
  assert.match(shared, /numColumns=\{tab === 'photos' \? 2 : 1\}/);
  assert.match(shared, /initialNumToRender=\{12\}/);
  assert.match(shared, /windowSize=\{7\}/);
  assert.match(shared, /ListFooterComponent=/);
});

test('custom chat folders remain accessible in the virtualized list header and empty state', () => {
  const folders = read('ChatFoldersScreen.js');
  assert.match(folders, /ListHeaderComponent=/);
  assert.match(folders, /ListEmptyComponent=/);
  assert.match(folders, /Your folders/);
});
