import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL(`../components/${name}`, import.meta.url), 'utf8');

test('Shared app header back action uses a consistent 48-point hit area', () => {
  assert.match(read('Header.js'), /backButton: \{ minWidth: 48, minHeight: 48/);
});

test('Chat media save and voice playback controls are easy to activate', () => {
  const source = read('ChatBubble.js');
  assert.match(source, /width: 48, height: 48, borderRadius: 24/);
  assert.match(source, /playButton: \{ width: 48, height: 48, minWidth: 48, minHeight: 48/);
});

test('Action sheet reactions wrap cleanly and preserve 48-point targets', () => {
  const source = read('ActionSheet.js');
  assert.match(source, /reactionRow: \{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center'/);
  assert.match(source, /width: 48,\s*height: 48,\s*borderRadius: 24/);
});

test('Call invitation sheet close, search and invite actions use 48-point controls', () => {
  const source = read('CallInvitePicker.js');
  assert.match(source, /closeButton: \{[\s\S]*?width: 48,\s*height: 48/);
  assert.match(source, /searchButton: \{[\s\S]*?width: 48,\s*height: 48/);
  assert.match(source, /inviteButton: \{[\s\S]*?minHeight: 48/);
  assert.match(source, /<Avatar name=\{displayName\} color=\{item\.avatar_color \|\| colors\.primary\} size=\{42\} \/>/);
  assert.doesNotMatch(source, /avatarText: \{ color: '#FFFFFF'/);
});

test('Avatar fallback follows the active theme palette and preserves foreground contrast', () => {
  const source = read('Avatar.js');
  assert.match(source, /const avatarColor = color \|\| colors\.primary/);
  assert.match(source, /const avatarTextColor = !color \|\| color === colors\.primary \? colors\.onPrimary/);
  assert.match(source, /function readableForeground\(color, fallback\)/);
  assert.match(source, /luminance > 0\.179 \? '#111827' : '#FFFFFF'/);
  assert.doesNotMatch(source, /color = '#6C5CE7'/);
});
