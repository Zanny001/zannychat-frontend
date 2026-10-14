import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPersonalDataExport, sanitizeExportMessage } from './dataExport.js';

test('export message excludes raw attachment URLs and storage paths', () => {
  const result = sanitizeExportMessage({ id: 'm1', text: 'hello', media_type: 'image', media_url: 'storage://chat-media/secret/photo.jpg', media_name: 'photo.jpg', media_size: 42 });
  assert.equal(result.text, 'hello');
  assert.deepEqual(result.attachment, { type: 'image', name: 'photo.jpg', sizeBytes: 42, durationSeconds: null, included: false });
  assert.equal('mediaUrl' in result, false);
  assert.equal(JSON.stringify(result).includes('secret/photo.jpg'), false);
});

test('export document contains portable user data and transparent omissions', () => {
  const result = buildPersonalDataExport({
    account: { id: 'u1', email: 'person@example.test' },
    profile: { id: 'u1', name: 'Person', avatar_url: 'https://example.test/avatar.png' },
    memberships: [{ conversation_id: 'c1', is_favorite: true }],
    conversations: [{ id: 'c1', is_group: true }],
    messages: [{ id: 'm1', conversation_id: 'c1', sender_id: 'u1', text: 'hello' }],
    preferences: { photoQuality: 'balanced' },
    exportedAt: '2026-01-01T00:00:00.000Z',
  });
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.account.email, 'person@example.test');
  assert.equal(result.conversationMemberships[0].favorite, true);
  assert.equal(result.messages[0].text, 'hello');
  assert.match(result.notice, /Attachment files and private media URLs are intentionally excluded/);
  assert.equal(result.exportedAt, '2026-01-01T00:00:00.000Z');
});

test('export message tolerates missing optional fields', () => {
  const result = sanitizeExportMessage({});
  assert.equal(result.text, '');
  assert.equal(result.attachment, null);
  assert.equal(result.id, null);
});
