import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const webKnot = fs.readFileSync(new URL('./Knot.web.js', import.meta.url), 'utf8');
const nativeKnot = fs.readFileSync(new URL('./Knot.js', import.meta.url), 'utf8');

test('web Knot renders the same static SVG mark without Reanimated host components', () => {
  assert.match(webKnot, /from 'react-native-svg'/);
  assert.match(webKnot, /<Path/);
  assert.match(webKnot, /openRingPath\(78\)/);\n  assert.match(webKnot, /openRingPath\(102\)/);\n  assert.match(webKnot, /A \\${RADIUS}/);
  assert.match(webKnot, /rotation=\{-35\}/);
  assert.match(webKnot, /rotation=\{145\}/);
  assert.doesNotMatch(webKnot, /react-native-reanimated|createAnimatedComponent|useAnimatedProps/);
  assert.match(nativeKnot, /useAnimatedProps/);
});
