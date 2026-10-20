import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../screens/ChannelsScreen.js', import.meta.url), 'utf8');

test('channel posts expose an accessible native share action', () => {
  assert.match(source, /const sharePost = async \(post\) =>/);
  assert.match(source, /Share\.share\(\{ title: selected\.title/);
  assert.match(source, /accessibilityLabel="Share channel post"/);
  assert.match(source, /onPress=\{\(\) => sharePost\(post\)\}/);
});

test('share action handles missing text and share-sheet errors', () => {
  assert.match(source, /This post has no text to share\./);
  assert.match(source, /Could not open the share menu\./);
});
