import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDraftKey, normalizeDraftText, parseDraftRecord, shouldPersistDraft } from './drafts.js';

test('draft keys are scoped to both account and conversation', () => {
  assert.notEqual(makeDraftKey('user/a', 'chat:1'), makeDraftKey('user/a', 'chat:2'));
  assert.notEqual(makeDraftKey('user/a', 'chat:1'), makeDraftKey('user:b', 'chat:1'));
  assert.equal(makeDraftKey('', 'chat:1'), null);
  assert.match(makeDraftKey('user/a', 'chat:1'), /user%2Fa/);
});

test('draft text is bounded and non-string values normalize to empty', () => {
  assert.equal(normalizeDraftText(null), '');
  assert.equal(normalizeDraftText(12), '');
  assert.equal(normalizeDraftText('x'.repeat(21000)).length, 20000);
});

test('blank drafts are not persisted but meaningful drafts are', () => {
  assert.equal(shouldPersistDraft('  \n '), false);
  assert.equal(shouldPersistDraft('  remember this  '), true);
});


test('reads legacy plain-text drafts and validates stored draft metadata', () => {
  assert.deepEqual(parseDraftRecord('old unsent text'), { text: 'old unsent text', updatedAt: null });
  assert.deepEqual(parseDraftRecord(JSON.stringify({ __zannychatDraft: true, text: 'new text', updatedAt: '2026-10-11T12:00:00.000Z' })), { text: 'new text', updatedAt: '2026-10-11T12:00:00.000Z' });
  assert.deepEqual(parseDraftRecord(JSON.stringify({ __zannychatDraft: true, text: 'x', updatedAt: 'not a date' })), { text: 'x', updatedAt: null });
});
