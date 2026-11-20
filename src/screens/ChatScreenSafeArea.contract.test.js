import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Chat screen and media overlays respect device safe areas', () => {
  const source = readFileSync(new URL('./ChatScreen.js', import.meta.url), 'utf8');
  assert.match(source, /from 'react-native-safe-area-context'/);
  assert.match(source, /const insets = useSafeAreaInsets\(\)/);
  assert.match(source, /<SafeAreaView edges=\{\['top', 'left', 'right', 'bottom'\]\}/);
  assert.match(source, /paddingTop: Math\.max\(insets\.top/);
  assert.match(source, /paddingBottom: Math\.max\(insets\.bottom/);
  assert.match(source, /top: Math\.max\(insets\.top/);
});
