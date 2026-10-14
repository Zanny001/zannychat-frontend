import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSavedMessage, filterSavedMessages } from './savedMessages.js';

test('saves only safe message metadata and excludes signed media URLs', () => {
  const item = makeSavedMessage({ id: 'm1', text: 'hello', mediaType: 'image', mediaName: 'photo.png', mediaUrl: 'https://signed.example/private?token=secret', createdAt: '2026-01-01' }, { id: 'c1', participant: { id: 'u2', name: 'Alex' } }, '2026-01-02');
  assert.equal(item.id, 'c1:m1');
  assert.equal(item.attachment.name, 'photo.png');
  assert.equal(JSON.stringify(item).includes('token=secret'), false);
  assert.equal(JSON.stringify(item).includes('signed.example'), false);
});

test('rejects deleted messages and empty content', () => {
  assert.throws(() => makeSavedMessage({ id: 'm1', text: 'gone', deletedAt: 'now' }, { id: 'c1' }), /Deleted/);
  assert.throws(() => makeSavedMessage({ id: 'm2', text: '  ' }, { id: 'c1' }), /no content/);
});

test('filters saved items by text, sender, and conversation', () => {
  const items = [
    { text: 'Remember launch', senderName: 'Sam', conversation: { name: 'Project' } },
    { text: 'Buy milk', senderName: 'Lee', conversation: { name: 'Family' } },
  ];
  assert.equal(filterSavedMessages(items, 'LAUNCH').length, 1);
  assert.equal(filterSavedMessages(items, 'family')[0].senderName, 'Lee');
  assert.equal(filterSavedMessages(items, '').length, 2);
});
