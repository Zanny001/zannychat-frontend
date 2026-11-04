import test from 'node:test';
import assert from 'node:assert/strict';
import { isLatestRequest } from './latestRequestGuard.js';

test('accepts the current request ID', () => {
  assert.equal(isLatestRequest(5, 5), true);
});

test('rejects stale responses that finish after a newer request', () => {
  assert.equal(isLatestRequest(4, 5), false);
});

test('rejects invalid request IDs', () => {
  for (const id of [0, -1, NaN, Infinity, 1.5, '5', null]) {
    assert.equal(isLatestRequest(id, 5), false);
  }
});
