import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./PinnedMessagesScreen.js', import.meta.url), 'utf8');

test('pinned message load failures are distinct from a genuine empty collection', () => {
  assert.ok(screen.includes(' : error ? ('));
  assert.match(screen, /Retry loading pinned messages/);
  assert.match(screen, /ListEmptyComponent=/);
  assert.match(screen, /No pinned messages yet/);
});

test('pinned message search and open/unpin actions have accessible labels and mobile targets', () => {
  assert.match(screen, /accessibilityLabel="Search pinned messages"/);
  assert.match(screen, /accessibilityLabel="Clear search"/);
  assert.match(screen, /accessibilityLabel="Unpin message"/);
  assert.match(screen, /accessibilityLabel="Open original message"/);
  assert.match(screen, /minWidth: 48, minHeight: 48/);
});

test('pinned library supports All, Text, Attachments and Voice note filters alongside search', () => {
  assert.match(screen, /const \[kindFilter, setKindFilter\] = useState\('all'\)/);
  assert.match(screen, /\['all', 'All'\], \['text', 'Text'\], \['attachments', 'Attachments'\], \['voice', 'Voice notes'\]/);
  assert.match(screen, /kindFilter === 'text' && !item\.attachment/);
  assert.match(screen, /kindFilter === 'attachments' && Boolean\(item\.attachment\)/);
  assert.match(screen, /kindFilter === 'voice' && item\.attachment\?\.type === 'voice'/);
  assert.match(screen, /filterPinnedMessages\(items, query, conversation\?\.id\)/);
  assert.match(screen, /accessibilityState=\{\{ selected \}\}/);
  assert.match(screen, /minHeight: 48, justifyContent: 'center'/);
});

test('pinned library no-match state accounts for both search text and content-type filters', () => {
  assert.match(screen, /query \|\| kindFilter !== 'all' \? 'No matching pins'/);
  assert.match(screen, /Try another filter or clear your search/);
});


test('pinned library introduces saved highlights with a live visible count', () => {
  assert.match(screen, /YOUR PERSONAL HIGHLIGHTS/);
  assert.match(screen, /Keep the important close\\./);
  assert.match(screen, /\\{visible\\.length\\}/);
  assert.match(screen, /jump straight back to its original conversation/);
});

test('pinned library empty state explains how to save and recover important moments', () => {
  assert.match(screen, /No pinned messages yet/);
  assert.match(screen, /pin it from the conversation/);
  assert.match(screen, /clear your search to see every saved message/);
  assert.match(screen, /navigation\\.navigate\\('Chat'/);
});