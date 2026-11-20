import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Data Export screen respects all device safe-area edges', () => {
  const source = readFileSync(new URL('./DataExportScreen.js', import.meta.url), 'utf8');
  assert.match(source, /from 'react-native-safe-area-context'/);
  assert.match(source, /<SafeAreaView edges=\{\['top', 'left', 'right', 'bottom'\]\}/);
});
