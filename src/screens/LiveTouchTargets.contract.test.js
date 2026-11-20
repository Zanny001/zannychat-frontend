import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL('./' + name, import.meta.url), 'utf8');

test('LIVE Creator Studio destructive and navigation controls meet 44pt targets', () => {
  const screen = read('LiveCreatorStudioScreen.js');
  assert.equal((screen.match(/width: 44, height: 44, borderRadius: 13/g) || []).length >= 2, true);
  assert.match(screen, /minHeight: 44, paddingHorizontal: 10/);
  assert.match(screen, /minHeight: 44, paddingHorizontal: spacing\.sm/);
});

test('LIVE Hub creator profile and follow controls meet 44pt targets', () => {
  const screen = read('LiveHubScreen.js');
  assert.doesNotMatch(screen, /minHeight: (?:38|40),/);
  assert.match(screen, /minHeight: 44, justifyContent: 'center'/);
  assert.match(screen, /minHeight: 44, paddingHorizontal: spacing\.sm/);
  assert.match(screen, /minHeight: 44, paddingHorizontal: spacing\.md/);
});

test('LIVE reaction and native/web resize handles meet 44pt targets', () => {
  const native = read('LiveStreamScreen.js');
  const web = read('LiveStreamScreen.web.js');
  assert.match(native, /minWidth: 44, minHeight: 44/);
  assert.match(native, /showComments && <ScrollView horizontal/);
  assert.match(native, /width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius/);
  assert.match(web, /width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius/);
  assert.match(web, /width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderTopLeftRadius/);
});
