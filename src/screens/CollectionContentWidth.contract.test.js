import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screens = [
  'ForwardMessageScreen.js',
  'SavedMessagesScreen.js',
  'DraftsScreen.js',
  'PinnedMessagesScreen.js',
  'ChatFoldersScreen.js',
  'SharedMediaScreen.js',
  'ChatAppearanceScreen.js',
];

test('secondary chat destinations use the shared moderate content width on wide screens', () => {
  for (const file of screens) {
    const source = readFileSync(new URL('./' + file, import.meta.url), 'utf8');
    assert.match(source, /layout\.contentMaxWidth/, file + ' must use the shared content measure');
    assert.match(source, /maxWidth: layout\.contentMaxWidth/, file + ' must cap desktop content width');
    assert.match(source, /alignSelf: 'center'/, file + ' must center its content column');
  }
});

test('collection screens preserve full-width mobile gutters and bounded list content', () => {
  for (const file of screens.slice(0, 6)) {
    const source = readFileSync(new URL('./' + file, import.meta.url), 'utf8');
    assert.match(source, /width: '100%', maxWidth: layout\.contentMaxWidth/, file + ' must remain fluid below the max width');
  }
});
