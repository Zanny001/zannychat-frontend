import test from 'node:test';
import assert from 'node:assert/strict';
import { createCustomMood, normalizeCustomPalette, normalizeHexColor } from '../theme/customPalette.js';

test('normalizes valid three- and six-digit hex colours', () => {
  assert.equal(normalizeHexColor('#abc'), '#AABBCC');
  assert.equal(normalizeHexColor('#795cff'), '#795CFF');
});

test('rejects malformed and non-string colour values', () => {
  assert.equal(normalizeHexColor('795CFF'), null);
  assert.equal(normalizeHexColor('#12'), null);
  assert.equal(normalizeHexColor('red'), null);
  assert.equal(normalizeHexColor(null), null);
});

test('requires both signature and conversation colours', () => {
  assert.deepEqual(normalizeCustomPalette({ signal: '#795CFF', thread: '#39E7E0' }), {
    signal: '#795CFF',
    thread: '#39E7E0',
    gold: '#FFD58A',
  });
  assert.equal(normalizeCustomPalette({ signal: 'invalid', thread: '#39E7E0' }), null);
});

test('builds a complete semantic mood without changing surface contrast tokens', () => {
  const mood = createCustomMood({ signal: '#795CFF', thread: '#39E7E0', gold: '#FFD58A' });
  assert.equal(mood.key, 'custom');
  assert.equal(mood.signal, '#795CFF');
  assert.equal(mood.thread, '#39E7E0');
  assert.equal(mood.ink, '#080B18');
  assert.equal(mood.paper, '#F3F5FF');
  assert.equal(createCustomMood({ signal: 'bad', thread: '#39E7E0' }), null);
});
