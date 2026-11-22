import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('chat folder reads fail closed instead of masquerading as an empty folder list', () => {
  const service = read('../services/chatFolders.js');
  assert.match(service, /throw new Error\('Your saved chat folders could not be read/);
  assert.match(service, /const folders = await loadChatFolders\(userId\)/);
  assert.match(service, /Read must succeed before writing/);
  assert.doesNotMatch(service, /catch \(_\) \{ return \[\]; \}/);
});

test('chat folder screen blocks mutations and offers retry when device storage cannot be read', () => {
  const screen = read('./ChatFoldersScreen.js');
  assert.match(screen, /const \[loadFailed, setLoadFailed\] = useState\(false\)/);
  assert.match(screen, /setLoadFailed\(true\)/);
  assert.match(screen, /Retry loading folders/);
  assert.match(screen, /disabled=\{saving \|\| loading \|\| loadFailed \|\| !rules\.length\}/);
  assert.match(screen, /if \(loadFailed \|\| loading\)/);
  assert.match(screen, /Your existing folders are hidden until device storage can be read safely/);
});


test('failed folder refresh hides stale rows and disables edit/delete actions', () => {
  const screen = read('./ChatFoldersScreen.js');
  assert.match(screen, /setLoadFailed\(true\);\s*setFolders\(\[\]\)/);
  assert.match(screen, /const edit = \(folder\) => \{ if \(loadFailed \|\| loading \|\| saving\)/);
  assert.match(screen, /const remove = \(folder\) => \{ if \(loadFailed \|\| loading \|\| saving\)/);
  assert.match(screen, /disabled=\{loadFailed \|\| loading \|\| saving\}/);
});


test('chat folder retry action meets the shared 48-point mobile target', () => {
  const screen = read('./ChatFoldersScreen.js');
  assert.match(screen, /accessibilityLabel="Retry loading chat folders" style=\{\{ minHeight: 48/);
});


test('chat folder builder uses distinct selectable category tiles and compact exclusion controls', () => {
  const screen = read('./ChatFoldersScreen.js');
  assert.match(screen, /Shape your chat space/);
  assert.match(screen, /Include conversations/);
  assert.match(screen, /width: '48%', minWidth: 132, flexGrow: 1, minHeight: 88/);
  assert.match(screen, /glow=\{selected\}/);
  assert.match(screen, /\{rules\.length\} selected/);
  assert.match(screen, /Fine-tune your view/);
  assert.match(screen, /accessibilityRole="checkbox"/);
  assert.match(screen, /minHeight: 52, flexDirection: 'row'/);
});

test('folder selection remains accessible and the create action retains its original validation gates', () => {
  const screen = read('./ChatFoldersScreen.js');
  assert.match(screen, /accessibilityState=\{\{ checked: selected \}\}/);
  assert.match(screen, /if \(!cleanName\) \{ setError\('Enter a name for this folder\.'/);
  assert.match(screen, /disabled=\{saving \|\| loading \|\| loadFailed \|\| !rules\.length\}/);
  assert.match(screen, /if \(loadFailed \|\| loading\)/);
});
