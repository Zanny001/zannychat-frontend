import test from 'node:test';
import assert from 'node:assert/strict';
import { searchMessages } from './searchMessages.js';

test('matches message text without case sensitivity', () => {
  assert.deepEqual(searchMessages([{ id: '1', text: 'Meet at the Library' }], 'library'), [{ id: '1' }]);
});

test('matches attachment names and reply previews', () => {
  const messages = [
    { id: 'file', mediaName: 'project-plan.pdf' },
    { id: 'reply', replyPreview: 'send the project plan' },
  ];
  assert.deepEqual(searchMessages(messages, 'project'), [{ id: 'file' }, { id: 'reply' }]);
});

test('ignores deleted messages and blank queries', () => {
  assert.deepEqual(searchMessages([{ id: 'gone', text: 'secret', deletedAt: 'now' }], 'secret'), []);
  assert.deepEqual(searchMessages([{ id: '1', text: 'hello' }], '   '), []);
});

test('returns no match for nonmatching content', () => {
  assert.deepEqual(searchMessages([{ id: '1', text: 'hello world' }], 'zanny'), []);
});
