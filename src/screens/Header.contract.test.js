import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const header = fs.readFileSync(new URL('../components/Header.js', import.meta.url), 'utf8');

test('shared header controls use accessible Pressable interactions', () => {
  assert.ok(header.includes('Pressable'));
  assert.equal(header.includes('TouchableOpacity'), false);
  assert.ok(header.includes('accessibilityRole="button"'));
  assert.ok(header.includes('accessibilityLabel="Go back"'));
});

test('shared header back control meets the 48-point touch target and shows pressed feedback', () => {
  assert.ok(header.includes('minWidth: 48'));
  assert.ok(header.includes('minHeight: 48'));
  assert.ok(header.includes('pressed && { backgroundColor: hexToRgba(colors.primary, 0.12) }'));
});


test('shared header supports a compact Crown Aurora eyebrow without disturbing title truncation', () => {
  assert.ok(header.includes('eyebrow'));
  assert.ok(header.includes('styles.eyebrowText'));
  assert.ok(header.includes("letterSpacing: 1.15"));
  assert.ok(header.includes("borderRadius: 16, borderWidth: 1"));
  assert.ok(header.includes("backgroundColor: colors.surface, borderColor: colors.border"));
});


test('core conversation and social destinations use purposeful Crown Aurora header context', () => {
  const screens = [
    ['ChatScreen.js', 'PRIVATE CONVERSATION'],
    ['ChatAppearanceScreen.js', 'PERSONALISE YOUR SPACE'],
    ['SharedMediaScreen.js', 'SHARED MOMENTS'],
    ['PinnedMessagesScreen.js', 'QUICK ACCESS'],
    ['ForwardMessageScreen.js', 'SHARE WITH CARE'],
    ['StatusUpdatesScreen.js', 'YOUR CIRCLE'],
  ];
  for (const [file, eyebrow] of screens) {
    const source = fs.readFileSync(new URL('./' + file, import.meta.url), 'utf8');
    assert.ok(source.includes(eyebrow), file + ' should expose its screen context');
  }
});
