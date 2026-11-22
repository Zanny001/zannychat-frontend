import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');

test('Saved and pinned message controls keep comfortable touch areas and compact empty states', () => {
  for (const name of ['SavedMessagesScreen.js', 'PinnedMessagesScreen.js']) {
    const source = read(name);
    assert.match(source, /accessibilityLabel="Clear search" style=\{\{ minWidth: 48, minHeight: 48/);
    assert.match(source, /accessibilityLabel="Remove saved message"|accessibilityLabel="Unpin message"/);
    assert.match(source, /minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center'/);
    assert.match(source, /paddingVertical: 48, paddingHorizontal: spacing\.xl/);
  }
});

test('Draft continuation and deletion actions retain balanced accessible dimensions', () => {
  const source = read('DraftsScreen.js');
  assert.match(source, /minHeight: 64, flexDirection: 'row'/);
  assert.match(source, /minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center'/);
  assert.match(source, /minHeight: 48, alignSelf: 'center'/);
});

test('Chat folder category tiles and exclusion rows retain accessible mobile touch dimensions', () => {
  const source = read('ChatFoldersScreen.js');
  assert.match(source, /minHeight: 88/);
  assert.match(source, /minHeight: 52, flexDirection: 'row'/);
  assert.match(source, /borderRadius: radii\.md, minHeight: 48/);
  assert.match(source, /borderRadius: radii\.pill, minHeight: 48/);
  assert.match(source, /minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center'/);
});

test('Forward-message recipient rows preserve a moderate, accessible card height', () => {
  const source = read('ForwardMessageScreen.js');
  assert.match(source, /style=\{\{ minHeight: 64 \}\} accessibilityRole="button"/);
  assert.match(source, /contentStyle=\{\{ minHeight: 64, flexDirection: 'row'/);
});

test('Shared-media tabs and retry actions use consistent touch dimensions', () => {
  const source = read('SharedMediaScreen.js');
  assert.match(source, /tab: \{ flex: 1, minHeight: 48/);
  assert.match(source, /retryButton: \{ minHeight: 48/);
});
