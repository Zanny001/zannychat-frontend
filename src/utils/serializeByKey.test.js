import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeByKey } from './serializeByKey.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test('serializes read-modify-write operations for the same key', async () => {
  const state = [];
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const first = serializeByKey('same', async () => { state.push('first-start'); await gate; state.push('first-end'); });
  const second = serializeByKey('same', async () => { state.push('second'); });
  await tick();
  assert.deepEqual(state, ['first-start']);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(state, ['first-start', 'first-end', 'second']);
});

test('different keys run independently', async () => {
  const order = [];
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const slow = serializeByKey('slow-key', async () => { await gate; order.push('slow'); });
  const fast = serializeByKey('fast-key', async () => { order.push('fast'); });
  await fast;
  assert.deepEqual(order, ['fast']);
  release();
  await slow;
  assert.deepEqual(order, ['fast', 'slow']);
});

test('a rejected operation does not block the next operation', async () => {
  await assert.rejects(serializeByKey('recover', async () => { throw new Error('storage failed'); }), /storage failed/);
  assert.equal(await serializeByKey('recover', async () => 'ok'), 'ok');
});
