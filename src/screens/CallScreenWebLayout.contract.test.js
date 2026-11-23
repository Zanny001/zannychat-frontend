import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./CallScreen.web.js', import.meta.url), 'utf8');
const stylesStart = source.indexOf('const styles = StyleSheet.create(');
assert.ok(stylesStart >= 0, 'web call screen styles should be defined');

test('web call screen module-level styles do not reference component-scoped theme layout', () => {
  const moduleStyles = source.slice(stylesStart);
  assert.equal(moduleStyles.includes('layout.'), false, 'module-level styles must not reference the component-scoped layout value');
  assert.ok(moduleStyles.includes('error: { textAlign: \'center\', marginTop: 16, maxWidth: 320 }'));
  assert.ok(moduleStyles.includes('maxWidth: 340'), 'module styles keep a safe fallback width');
  assert.ok(source.includes('maxWidth: layout.contentMaxWidth'), 'component applies the shared responsive width dynamically');
});
