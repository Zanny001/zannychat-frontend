import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../screens/ChannelsScreen.js', import.meta.url), 'utf8');

test('channel post composer offers accessible quick emoji insertion and persists the draft', () => {
  assert.match(source, /Quick emojis for channel post/);
  assert.match(source, /Insert \$\{emoji\} into channel post/);
  assert.match(source, /saveChannelPostDraft\(AsyncStorage, key, draft\)/);
  assert.match(source, /const QUICK_COMPOSER_EMOJIS/);
});

test('channel comments offer accessible quick emoji insertion with length protection', () => {
  assert.match(source, /Quick emojis for comment/);
  assert.match(source, /Insert \$\{emoji\} into comment/);
  assert.match(source, /\$\{old\[post\.id\] \|\| ''\}\$\{emoji\}`\.slice\(0, 1000\)/);
});

test('channel post editing also exposes quick emoji insertion with the post length limit', () => {
  assert.match(source, /Quick emojis for editing channel post/);
  assert.ok(source.includes('Insert ${emoji} into edited post'));
  assert.ok(source.includes('`${value}${emoji}`.slice(0, 4000)'));
});
