import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const screenDirectory = fileURLToPath(new URL('.', import.meta.url));
const screenFiles = readdirSync(screenDirectory)
  .filter((name) => name.endsWith('Screen.js') || name.endsWith('Screen.web.js'));

test('every shipped screen uses the shared theme and dynamic typography system', () => {
  const missing = [];
  for (const name of screenFiles) {
    const source = readFileSync(new URL(name, import.meta.url), 'utf8');
    if (!/\buseTheme\b/.test(source)) missing.push(name + ': theme');
    if (!/\btypography\s*\./.test(source)) missing.push(name + ': typography');
  }
  assert.deepEqual(missing, [], 'Screen design-system gaps: ' + missing.join(', '));
});

test('screen inventory includes native and web-specific calling and LIVE experiences', () => {
  for (const name of [
    'CallScreen.js',
    'CallScreen.web.js',
    'GroupCallScreen.js',
    'GroupCallScreen.web.js',
    'LiveStreamScreen.js',
    'LiveStreamScreen.web.js',
    'IncomingCallScreen.js',
    'OutgoingCallScreen.js',
  ]) {
    assert.ok(screenFiles.includes(name), name + ' must remain in the screen inventory');
  }
});
