import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./LiveCreatorProfileScreen.js', import.meta.url), 'utf8');

test('creator replay collection only opens replays that are ready', () => {
  assert.match(source, /disabled=\{item\.status !== 'ready'\}/);
  assert.match(source, /accessibilityState=\{\{ disabled: item\.status !== 'ready' \}\}/);
  assert.match(source, /item\.status === 'ready' \? 'play-circle'/);
  assert.match(source, /item\.status === 'failed' \? 'Recording unavailable'/);
});
