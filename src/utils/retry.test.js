import test from 'node:test';
import assert from 'node:assert/strict';
import { isTransientFailure, retryTransient } from './retry.js';

test('recognizes temporary network and server failures, not validation errors', () => {
  assert.equal(isTransientFailure(new Error('Network request failed')), true);
  assert.equal(isTransientFailure({ status: 503 }), true);
  assert.equal(isTransientFailure({ status: 400, message: 'Invalid payload' }), false);
});

test('retries a transient failure and returns the successful result', async () => {
  let calls = 0;
  const result = await retryTransient(async () => {
    calls += 1;
    if (calls === 1) throw new Error('Failed to fetch');
    return 'saved';
  }, { attempts: 3, delay: 0, sleep: async () => {} });
  assert.equal(result, 'saved');
  assert.equal(calls, 2);
});

test('does not retry non-transient errors', async () => {
  let calls = 0;
  await assert.rejects(() => retryTransient(async () => {
    calls += 1;
    throw Object.assign(new Error('Invalid message'), { status: 400 });
  }, { attempts: 3, delay: 0, sleep: async () => {} }), /Invalid message/);
  assert.equal(calls, 1);
});
