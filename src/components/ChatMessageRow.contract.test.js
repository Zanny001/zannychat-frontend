import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./ChatMessageRow.js', import.meta.url), 'utf8');
const screen = readFileSync(new URL('../screens/ChatScreen.js', import.meta.url), 'utf8');

test('chat timeline row owns only presentation and delegates message actions', () => {
  assert.match(source, /item\?\.type === 'day'/);
  assert.match(source, /<ChatBubble/);
  for (const prop of ['onSwipeReply', 'onShowActions', 'onViewImage', 'onSaveMedia', 'onOpenFile', 'onOpenContact']) {
    assert.ok(source.includes(prop), prop + ' must remain connected to ChatBubble');
  }
});

test('ChatScreen keeps message ownership and uses the extracted row component', () => {
  assert.match(screen, /<ChatMessageRow/);
  assert.match(screen, /isMineMessage\(item\)/);
  assert.match(screen, /computeStatus\(item\)/);
  assert.match(screen, /searchMatches\.some/);
  assert.doesNotMatch(screen, /<ChatBubble/);
});
