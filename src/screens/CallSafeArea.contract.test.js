import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('native and web calling screens use the shared four-edge safe-area provider', () => {
  for (const name of [
    'CallScreen.js',
    'CallScreen.web.js',
    'GroupCallScreen.js',
    'GroupCallScreen.web.js',
    'IncomingCallScreen.js',
    'OutgoingCallScreen.js',
  ]) {
    const source = readFileSync(new URL('./' + name, import.meta.url), 'utf8');
    assert.match(source, /from 'react-native-safe-area-context'/, name + ' must use safe-area-context');
    assert.match(source, /<SafeAreaView edges=\{\['top', 'left', 'right', 'bottom'\]\}/, name + ' must respect all device safe areas');
  }
});
