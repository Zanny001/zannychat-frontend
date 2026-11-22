import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./SavedMessagesScreen.js', import.meta.url), 'utf8');

test('saved messages load failures are distinct from a genuine empty collection', () => {
  assert.ok(screen.includes(' : error ? ('));
  assert.match(screen, /Retry loading saved messages/);
  assert.match(screen, /ListEmptyComponent=/);
  assert.match(screen, /Nothing saved yet/);
});

test('saved message search and open/remove actions have accessible labels and mobile targets', () => {
  assert.match(screen, /accessibilityLabel="Search saved messages"/);
  assert.match(screen, /accessibilityLabel="Clear search"/);
  assert.match(screen, /accessibilityLabel="Remove saved message"/);
  assert.match(screen, /accessibilityLabel="Open saved message in conversation"/);
  assert.match(screen, /minWidth: 48, minHeight: 48/);
});

test('saved message library supports All, Text, Attachments and Voice note filters alongside search', () => {
  assert.match(screen, /const \[kindFilter, setKindFilter\] = useState\('all'\)/);
  assert.match(screen, /\['all', 'All'\], \['text', 'Text'\], \['attachments', 'Attachments'\], \['voice', 'Voice notes'\]/);
  assert.match(screen, /kindFilter === 'text' && !item\.attachment/);
  assert.match(screen, /kindFilter === 'attachments' && Boolean\(item\.attachment\)/);
  assert.match(screen, /kindFilter === 'voice' && item\.attachment\?\.type === 'voice'/);
  assert.match(screen, /filterSavedMessages\(items, query\)/);
  assert.match(screen, /accessibilityState=\{\{ selected \}\}/);
  assert.match(screen, /minHeight: 48, justifyContent: 'center'/);
});

test('saved message empty state responds to active content-type filters', () => {
  assert.match(screen, /query \|\| kindFilter !== 'all' \? 'No matching bookmarks'/);
  assert.match(screen, /Try another filter or clear your search/);
});
