import test from 'node:test';
import assert from 'node:assert/strict';
import { clearStatusDraft, normalizeStatusDraft, readStatusDraft, STATUS_DRAFT_STORAGE_KEY, writeStatusDraft } from './statusDraftStorage.js';

test('status draft normalization keeps only supported fields and bounds text, expiry, and audience IDs', () => {
  const ids = ['contact-a', 'contact-a', '', 3, 'contact-b'];
  assert.deepEqual(normalizeStatusDraft({ text: '  hello  ', audience: 'selected_contacts', expiryHours: 12, selectedAudienceIds: ids, mediaUri: 'file://private' }), {
    version: 1, text: 'hello', audience: 'selected_contacts', expiryHours: 12, selectedAudienceIds: ['contact-a', 'contact-b'],
  });
});

test('invalid or empty drafts fail closed and use safe defaults for malformed preferences', () => {
  assert.equal(normalizeStatusDraft(null), null);
  assert.equal(normalizeStatusDraft({ text: '  ' }), null);
  assert.deepEqual(normalizeStatusDraft({ text: ' hello ', audience: 'invalid', expiryHours: 999 }), {
    version: 1, text: 'hello', audience: 'contacts', expiryHours: 24, selectedAudienceIds: [],
  });
});

test('draft storage round-trips text-only drafts and clears them after publish', async () => {
  const data = new Map();
  const storage = { getItem: async (key) => data.get(key) ?? null, setItem: async (key, value) => data.set(key, value), removeItem: async (key) => data.delete(key) };
  assert.equal(await writeStatusDraft(storage, { text: 'A draft', audience: 'only_me', expiryHours: 6 }), true);
  assert.deepEqual(await readStatusDraft(storage), { version: 1, text: 'A draft', audience: 'only_me', expiryHours: 6, selectedAudienceIds: [] });
  assert.equal(await clearStatusDraft(storage), true);
  assert.equal(data.has(STATUS_DRAFT_STORAGE_KEY), false);
  assert.equal(await readStatusDraft(storage), null);
});

test('corrupt storage and unavailable adapters never throw', async () => {
  assert.equal(await readStatusDraft({ getItem: async () => '{broken' }), null);
  assert.equal(await writeStatusDraft(null, { text: 'hello' }), false);
  assert.equal(await clearStatusDraft({ removeItem: async () => { throw new Error('unavailable'); } }), false);
});
