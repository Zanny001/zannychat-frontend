import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('chat header progressively hides secondary actions before the title is crowded', () => {
  const chat = source('./ChatScreen.js');
  assert.match(chat, /const compactHeader = windowWidth < 480/);
  assert.match(chat, /const ultraCompactHeader = windowWidth < 380/);
  assert.match(chat, /!ultraCompactHeader && !display\.isGroup/);
  assert.match(chat, /!compactHeader && <TouchableOpacity/);
});

test('shared header gives the title flexible space and preserves one-line truncation', () => {
  const header = source('../components/Header.js');
  assert.match(header, /left: \{[^}]*flex: 1, minWidth: 0/);
  assert.match(header, /right: \{[^}]*flexDirection: 'row'[^}]*flexShrink: 0/);
  assert.match(header, /numberOfLines=\{1\} ellipsizeMode="tail"/);
});

test('chat header icon controls meet the 44-point touch target guideline', () => {
  const chat = source('./ChatScreen.js');
  assert.match(chat, /headerAction: \{ width: 44, height: 44, borderRadius: 22/);
});

test('chat message bubbles constrain long text and wrap delivery metadata without overflow', () => {
  const bubble = source('../components/ChatBubble.js');
  assert.match(bubble, /maxWidth: '76%', minWidth: 0/);
  assert.match(bubble, /metaRow: \{[^}]*flexWrap: 'wrap'/);
  assert.match(bubble, /fileRow: \{[^}]*minWidth: 0,[^}]*maxWidth: '100%'/);
});
