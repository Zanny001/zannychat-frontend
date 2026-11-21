import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./App.js', import.meta.url), 'utf8');

test('startup deadline is cancelled once the app has fonts and an initial route', () => {
  assert.match(source, /const appReady = \(fontsLoaded \|\| !!fontError \|\| fontFallbackReady \|\| startupDeadlineReached\) && initialRoute !== null/);
  assert.match(source, /if \(appReady\) return undefined;[\s\S]*setTimeout\(\(\) => \{/);
  assert.match(source, /return \(\) => clearTimeout\(startupDeadline\);[\s\S]*\}, \[appReady\]\);/);
});
