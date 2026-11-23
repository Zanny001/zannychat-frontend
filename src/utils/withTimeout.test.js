import test from 'node:test';
import assert from 'node:assert/strict';
import { withTimeout } from './withTimeout.js';

test('withTimeout returns a completed operation result', async () => {
  const result = await withTimeout(async () => ({ ok: true }), {
    timeoutMs: 100,
    label: 'test operation',
  });
  assert.deepEqual(result, { ok: true });
});

test('withTimeout aborts the operation and reports a typed timeout', async () => {
  let receivedSignal;
  await assert.rejects(
    withTimeout((signal) => {
      receivedSignal = signal;
      return new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
    }, { timeoutMs: 15, label: 'slow request' }),
    (error) => error.code === 'ETIMEDOUT'
      && error.name === 'TimeoutError'
      && /slow request timed out after 15ms/.test(error.message),
  );
  assert.equal(receivedSignal.aborted, true);
});

test('withTimeout propagates caller cancellation without misreporting a timeout', async () => {
  const caller = new AbortController();
  const reason = new Error('screen closed');
  const pending = withTimeout((signal) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }), { timeoutMs: 1000, signal: caller.signal });
  caller.abort(reason);
  await assert.rejects(pending, (error) => error === reason);
});

test('withTimeout rejects immediately for an already-aborted caller signal', async () => {
  const caller = new AbortController();
  caller.abort(new Error('already cancelled'));
  await assert.rejects(
    withTimeout(async () => 'must not run', { signal: caller.signal }),
    /already cancelled/,
  );
});
