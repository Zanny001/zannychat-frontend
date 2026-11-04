import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePendingAttachments, MAX_ATTACHMENT_CAPTION_LENGTH } from './normalizePendingAttachments.js';

const valid = (overrides = {}) => ({
  id: 'attachment-1', uri: 'file:///tmp/photo.jpg', kind: 'image',
  name: 'photo.jpg', mimeType: 'image/jpeg', size: 123, caption: 'hello',
  createdAt: '2026-10-23T10:00:00Z', attempts: 1, ...overrides,
});

test('attachment normalizer keeps only supported fields from persisted records', () => {
  const [item] = normalizePendingAttachments([valid({ secret: 'do-not-retain', debugPayload: { large: true } })]);
  assert.equal(item.name, 'photo.jpg');
  assert.equal('secret' in item, false);
  assert.equal('debugPayload' in item, false);
});

test('attachment normalizer bounds optional metadata and rejects control characters', () => {
  const [item] = normalizePendingAttachments([valid({
    name: `  ${'x'.repeat(300)}  `,
    mimeType: ` ${'m'.repeat(200)} `,
    size: -1,
    durationSeconds: 90000,
    caption: 'a'.repeat(MAX_ATTACHMENT_CAPTION_LENGTH + 50),
    lastError: 'failure\u0000 detail',
  })]);
  assert.equal(item.name.length, 255);
  assert.equal(item.mimeType.length, 128);
  assert.equal('size' in item, false);
  assert.equal('durationSeconds' in item, false);
  assert.equal(item.caption.length, MAX_ATTACHMENT_CAPTION_LENGTH);
  assert.match(item.lastError, /still waiting to upload/);
  assert.equal(item.lastError.includes('failure'), false);
  assert.deepEqual(normalizePendingAttachments([valid({ uri: 'file:///tmp/photo\n.jpg' })]), []);
});

test('attachment normalizer preserves retry metadata and de-duplicates valid IDs', () => {
  const [item] = normalizePendingAttachments([
    valid({ attempts: 2, name: 'older.jpg' }),
    valid({ attempts: 3, name: 'newer.jpg', nextRetryAt: '2026-10-23T10:30:00+01:00' }),
  ]);
  assert.equal(item.name, 'newer.jpg');
  assert.equal(item.attempts, 3);
  assert.equal(item.nextRetryAt, '2026-10-23T09:30:00.000Z');
});
