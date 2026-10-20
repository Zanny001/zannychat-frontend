import test from 'node:test';
import assert from 'node:assert/strict';
import { clearChannelPostDraft, saveChannelPostDraft } from './channelDraftStorage.js';

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test('draft clear waits for an in-flight autosave and prevents resurrection', async () => {
  const gate = deferred();
  const values = new Map();
  const calls = [];
  const storage = {
    async setItem(key, value) {
      calls.push(`set:start:${value}`);
      if (value === 'old draft') await gate.promise;
      values.set(key, value);
      calls.push(`set:end:${value}`);
    },
    async removeItem(key) { calls.push('remove'); values.delete(key); },
  };
  const saving = saveChannelPostDraft(storage, 'draft-key', 'old draft');
  await Promise.resolve();
  const clearing = clearChannelPostDraft(storage, 'draft-key');
  gate.resolve();
  assert.equal(await saving, true);
  assert.equal(await clearing, true);
  assert.equal(values.has('draft-key'), false);
  assert.deepEqual(calls, ['set:start:old draft', 'set:end:old draft', 'remove']);
});

test('failed draft writes do not block a later clear', async () => {
  let attempts = 0;
  const storage = {
    async setItem() { attempts += 1; throw new Error('storage full'); },
    async removeItem() { attempts += 1; },
  };
  await assert.rejects(saveChannelPostDraft(storage, 'failed-key', 'draft'), /storage full/);
  assert.equal(await clearChannelPostDraft(storage, 'failed-key'), true);
  assert.equal(attempts, 2);
});

test('invalid storage requests safely return false', async () => {
  assert.equal(await saveChannelPostDraft(null, 'key', 'draft'), false);
  assert.equal(await saveChannelPostDraft({ setItem() {} }, null, 'draft'), false);
  assert.equal(await clearChannelPostDraft({}, 'key'), false);
});
