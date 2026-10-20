import test from 'node:test';
import assert from 'node:assert/strict';
import { attachmentRetryDelayMs, getAttachmentNextRetryAt, isAttachmentRetryDue, ATTACHMENT_RETRY_MAX_MS } from './attachmentRetryPolicy.js';

test('attachment retry delay grows exponentially and remains bounded', () => {
  assert.equal(attachmentRetryDelayMs(1), 15_000);
  assert.equal(attachmentRetryDelayMs(2), 30_000);
  assert.equal(attachmentRetryDelayMs(3), 60_000);
  assert.equal(attachmentRetryDelayMs(100), ATTACHMENT_RETRY_MAX_MS);
  assert.equal(attachmentRetryDelayMs(0), 15_000);
});

test('attachment retry timestamp is deterministic from supplied clock', () => {
  assert.equal(getAttachmentNextRetryAt(2, 1_000), new Date(31_000).toISOString());
});

test('legacy entries are retryable, future entries wait, and due or invalid dates retry', () => {
  const now = Date.parse('2026-01-01T00:00:00.000Z');
  assert.equal(isAttachmentRetryDue({}, now), true);
  assert.equal(isAttachmentRetryDue({ nextRetryAt: new Date(now + 1000).toISOString() }, now), false);
  assert.equal(isAttachmentRetryDue({ nextRetryAt: new Date(now - 1000).toISOString() }, now), true);
  assert.equal(isAttachmentRetryDue({ nextRetryAt: 'invalid' }, now), true);
});
