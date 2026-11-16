import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearStatusDraft,
  getStatusDraftStorageKey,
  normalizeStatusDraft,
  readStatusDraft,
  LEGACY_STATUS_DRAFT_STORAGE_KEY,
  writeStatusDraft,
} from './statusDraftStorage.js';

function createStorage() {
  const data = new Map();
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => data.set(key, value),
    removeItem: async (key) => data.delete(key),
  };
}

test('status draft normalization keeps only supported fields and bounds text, expiry, and audience IDs', () => {
  const ids = ['contact-a', 'contact-a', '', 3, 'contact-b'];
  assert.deepEqual(normalizeStatusDraft({ text: '  hello  ', audience: 'selected_contacts', expiryHours: 12, selectedAudienceIds: ids, mediaUri: 'file://private' }), {
    version: 1, text: 'hello', audience: 'selected_contacts', expiryHours: 12, selectedAudienceIds: ['contact-a', 'contact-b'],
  });
});

test('status draft keys are isolated by account and reject missing identities', () => {
  assert.equal(getStatusDraftStorageKey('user:alpha'), 'zannychat.status-draft.v1.user%3Aalpha');
  assert.notEqual(getStatusDraftStorageKey('user-a'), getStatusDraftStorageKey('user-b'));
  assert.equal(getStatusDraftStorageKey(''), null);
  assert.equal(getStatusDraftStorageKey(null), null);
});

test('different accounts cannot read each other’s status text or audience selection', async () => {
  const storage = createStorage();
  await writeStatusDraft(storage, 'user-a', { text: 'Private A draft', audience: 'selected_contacts', expiryHours: 12, selectedAudienceIds: ['contact-a'] });
  await writeStatusDraft(storage, 'user-b', { text: 'Private B draft', audience: 'only_me', expiryHours: 6 });

  assert.equal((await readStatusDraft(storage, 'user-a')).text, 'Private A draft');
  assert.deepEqual(await readStatusDraft(storage, 'user-b'), {
    version: 1, text: 'Private B draft', audience: 'only_me', expiryHours: 6, selectedAudienceIds: [],
  });
  assert.equal(await readStatusDraft(storage, 'user-c'), null);
});

test('legacy unscoped status drafts are discarded instead of assigned to the next account', async () => {
  const storage = createStorage();
  storage.data.set(LEGACY_STATUS_DRAFT_STORAGE_KEY, JSON.stringify({ text: 'Previous account private text', audience: 'only_me' }));

  assert.equal(await readStatusDraft(storage, 'new-user'), null);
  assert.equal(storage.data.has(LEGACY_STATUS_DRAFT_STORAGE_KEY), false);
  assert.equal(storage.data.has(getStatusDraftStorageKey('new-user')), false);
});

test('clearing one account draft preserves other accounts and clears the legacy key', async () => {
  const storage = createStorage();
  await writeStatusDraft(storage, 'user-a', { text: 'A draft' });
  await writeStatusDraft(storage, 'user-b', { text: 'B draft' });
  storage.data.set(LEGACY_STATUS_DRAFT_STORAGE_KEY, JSON.stringify({ text: 'Legacy' }));

  assert.equal(await clearStatusDraft(storage, 'user-a'), true);
  assert.equal(await readStatusDraft(storage, 'user-a'), null);
  assert.equal((await readStatusDraft(storage, 'user-b')).text, 'B draft');
  assert.equal(storage.data.has(LEGACY_STATUS_DRAFT_STORAGE_KEY), false);
});

test('invalid drafts and unavailable adapters fail closed without throwing', async () => {
  assert.equal(normalizeStatusDraft(null), null);
  assert.equal(normalizeStatusDraft({ text: '  ' }), null);
  assert.deepEqual(normalizeStatusDraft({ text: ' hello ', audience: 'invalid', expiryHours: 999 }), {
    version: 1, text: 'hello', audience: 'contacts', expiryHours: 24, selectedAudienceIds: [],
  });
  assert.equal(await readStatusDraft(null, 'user-a'), null);
  assert.equal(await writeStatusDraft(null, 'user-a', { text: 'hello' }), false);
  assert.equal(await clearStatusDraft({ removeItem: async () => { throw new Error('unavailable'); } }, 'user-a'), false);
});
