import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./LiveStreamScreen.js', import.meta.url), 'utf8');

test('LIVE management actions use a horizontal rail instead of crowding the title row', () => {
  assert.match(source, /ScrollView[\s\S]*?horizontal[\s\S]*?LIVE management actions/);
  assert.match(source, /accessibilityLabel="Choose LIVE audio output"/);
  assert.match(source, /accessibilityLabel=\{creatorMode \? 'End LIVE stream' : 'Leave LIVE stream'\}/);
  assert.match(source, /minWidth: 44, minHeight: 44/);
});

test('LIVE video stage reserves space for the compact two-row creator header', () => {
  assert.match(source, /paddingTop: creatorMode \|\| moderatorMode \? 108 : 58/);
  assert.match(source, /aspectRatio: 16 \/ 9/);
});
