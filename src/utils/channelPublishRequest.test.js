import test from 'node:test';
import assert from 'node:assert/strict';
import { clearChannelPublishRequest, getChannelPublishRequest, markChannelPublishRequestComplete } from './channelPublishRequest.js';

function memoryStorage() {
  const values = new Map();
  return {
    values,
    async getItem(key) { return values.has(key) ? values.get(key) : null; },
    async setItem(key, value) { values.set(key, value); },
    async removeItem(key) { values.delete(key); },
  };
}

test('reuses a persisted idempotency key after an app restart for the same body', async () => {
  const storage = memoryStorage();
  const first = await getChannelPublishRequest(storage, 'publish:channel:user', 'Hello', () => 'request-id-00000001');
  const afterRestart = await getChannelPublishRequest(storage, 'publish:channel:user', 'Hello', () => 'request-id-00000002');
  assert.equal(first, 'request-id-00000001');
  assert.equal(afterRestart, first);
});

test('a changed body gets a new idempotency key', async () => {
  const storage = memoryStorage();
  await getChannelPublishRequest(storage, 'publish:key', 'Hello', () => 'request-id-00000001');
  const next = await getChannelPublishRequest(storage, 'publish:key', 'Hello again', () => 'request-id-00000002');
  assert.equal(next, 'request-id-00000002');
});

test('successful publish can clear its persisted request state', async () => {
  const storage = memoryStorage();
  await getChannelPublishRequest(storage, 'publish:key', 'Hello', () => 'request-id-00000001');
  assert.equal(await clearChannelPublishRequest(storage, 'publish:key'), true);
  assert.equal(storage.values.has('publish:key'), false);
});

test('invalid request inputs fail closed instead of publishing without a key', async () => {
  await assert.rejects(getChannelPublishRequest(null, 'key', 'body'), /safe channel publish request/);
  await assert.rejects(getChannelPublishRequest(memoryStorage(), 'key', '   '), /safe channel publish request/);
});

test('completed request keys are not reused when cleanup fails', async () => {
  const storage = memoryStorage();
  await getChannelPublishRequest(storage, 'publish:key', 'Hello', () => 'request-id-00000001');
  assert.equal(await markChannelPublishRequestComplete(storage, 'publish:key'), true);
  const next = await getChannelPublishRequest(storage, 'publish:key', 'Hello', () => 'request-id-00000002');
  assert.equal(next, 'request-id-00000002');
});
