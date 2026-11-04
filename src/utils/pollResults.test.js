import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPollVoteSummary, getPollOptionPercentage } from './pollResults.js';

test('calculates rounded percentages for single-choice poll results', () => {
  assert.equal(getPollOptionPercentage(1, 3), 33);
  assert.equal(getPollOptionPercentage(2, 3), 67);
  assert.equal(getPollOptionPercentage(4, 4), 100);
});

test('handles empty totals and invalid or unsafe counts without NaN', () => {
  for (const [votes, total] of [[0, 0], [1, 0], [-1, 4], ['bad', 4], [Number.MAX_SAFE_INTEGER + 1, 4], [1, Number.MAX_SAFE_INTEGER + 1]]) {
    assert.equal(getPollOptionPercentage(votes, total), 0);
  }
});

test('formats stable accessible summary data', () => {
  assert.deepEqual(formatPollVoteSummary(3, 4), { percentage: 75, label: '75%', votes: 3 });
  assert.deepEqual(formatPollVoteSummary(-2, 4), { percentage: 0, label: '0%', votes: 0 });
});
