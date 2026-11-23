import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./CallScreen.web.js', import.meta.url), 'utf8');
const stylesStart = source.indexOf('const styles = StyleSheet.create(');
assert.ok(stylesStart >= 0, 'web call screen styles should be defined');

test('web call screen module-level styles do not reference component-scoped theme layout', () => {
  const moduleStyles = source.slice(stylesStart);
  assert.doesNotMatch(moduleStyles, /\\blayout\\s*\\./, 'module-level styles must not reference the component-scoped layout value');
  assert.match(moduleStyles, /error:\\s*\\{[^}]*maxWidth:\\s*320/);
});
