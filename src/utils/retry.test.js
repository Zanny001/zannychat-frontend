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

test('parses Retry-After seconds and clamps excessive server delays', async () => {
  const { getRetryAfterDelayMs } = await import('./retry.js');
  assert.equal(getRetryAfterDelayMs({ headers: { 'retry-after': '2' } }, 0), 2000);
  assert.equal(getRetryAfterDelayMs({ retryAfter: '999' }, 0), 30_000);
  assert.equal(getRetryAfterDelayMs({ retryAfter: 'not-a-date' }, 0), null);
});

test('honors a valid Retry-After header for transient failures', async () => {
  const waits = [];
  let calls = 0;
  const result = await retryTransient(async () => {
    calls += 1;
    if (calls === 1) throw Object.assign(new Error('Rate limited'), { status: 429, headers: { 'retry-after': '3' } });
    return 'sent';
  }, { attempts: 2, delay: 1, now: () => 0, sleep: async (ms) => waits.push(ms) });
  assert.equal(result, 'sent');
  assert.deepEqual(waits, [3000]);
});

test('supports HTTP-date Retry-After values with an injected clock', async () => {
  const { getRetryAfterDelayMs } = await import('./retry.js');
  const now = Date.parse('2026-01-01T00:00:00.000Z');
  assert.equal(getRetryAfterDelayMs({ headers: { 'Retry-After': 'Thu, 01 Jan 2026 00:00:05 GMT' } }, now), 5000);
});


test('accepts array-style Retry-After headers and trims whitespace', async () => {
  const { getRetryAfterDelayMs } = await import('./retry.js');
  assert.equal(getRetryAfterDelayMs({ headers: { 'retry-after': [' 4 ', '9'] } }, 0), 4000);
});

test('allows an explicit zero maximum delay', async () => {
  const { getRetryAfterDelayMs } = await import('./retry.js');
  assert.equal(getRetryAfterDelayMs({ retryAfter: '4' }, 0, 0), 0);
});

test('rejects non-RFC numeric Retry-After values and invalid clock values', async () => {
  const { getRetryAfterDelayMs } = await import('./retry.js');
  assert.equal(getRetryAfterDelayMs({ retryAfter: '-2' }, 0), null);
  assert.equal(getRetryAfterDelayMs({ retryAfter: '1.5' }, 0), null);
  assert.equal(getRetryAfterDelayMs({ retryAfter: 'Thu, 01 Jan 2026 00:00:05 GMT' }, 'not-a-clock'), null);
});

test('does not classify non-HTTP status values above 599 as transient', () => {
  assert.equal(isTransientFailure({ status: 600 }), false);
});
