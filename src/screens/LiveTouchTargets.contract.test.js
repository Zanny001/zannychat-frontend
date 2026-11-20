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


test('LIVE list and operations screens use the shared safe-area provider', () => {
  const screens = [
    'LiveHubScreen.js',
    'LiveReplayScreen.js',
    'LiveReplayLibraryScreen.js',
    'LiveCreatorStudioScreen.js',
    'LiveGuestQueueScreen.js',
    'LiveModerationScreen.js',
    'LiveReportsScreen.js',
    'LiveEventsScreen.js',
    'LiveLeaderboardScreen.js',
    'LiveSettingsScreen.js',
    'LiveAnalyticsScreen.js',
    'LivePostStreamSummaryScreen.js',
    'LivePreflightScreen.js',
  ];
  for (const name of screens) {
    assert.match(read(name), /from 'react-native-safe-area-context'/, name + ' must use safe-area-context');
  }
});

test('native and web LIVE overlays respect device insets without shrinking full-bleed video', () => {
  const native = read('LiveStreamScreen.js');
  const web = read('LiveStreamScreen.web.js');
  assert.match(native, /const insets = useSafeAreaInsets\(\)/);
  assert.match(native, /top: Math\.max\(insets\.top \+ 8/);
  assert.match(native, /top: Math\.max\(insets\.top \+ 72/);
  assert.match(native, /top: Math\.max\(insets\.top \+ 118/);
  assert.match(native, /top: Math\.max\(insets\.top \+ 164/);
  assert.match(native, /bottom: Math\.max\(insets\.bottom \+ 12/);
  assert.match(web, /const insets = useSafeAreaInsets\(\)/);
  assert.match(web, /top: insets\.top/);
  assert.match(web, /top: insets\.top \+ 164/);
  assert.match(web, /bottom: 12 \+ insets\.bottom/);
  assert.match(web, /bottom: 150 \+ insets\.bottom/);
  assert.match(web, /return <View style=\{\{ flex: 1, minHeight: '100%'/);
  assert.match(web, /color: colors\.onDanger, fontSize: 10/);
});
