import test from 'node:test';
import assert from 'node:assert/strict';
import { attachPollVoteCounts } from './pollVoteCounts.js';

test('aggregates vote counts by poll and option and preserves option order', () => {
  const polls = [{ id: 'p1', poll_options: [{ id: 'b', position: 1 }, { id: 'a', position: 0 }] }];
  const result = attachPollVoteCounts(polls, [
    { poll_id: 'p1', option_id: 'a', vote_count: '3' },
    { poll_id: 'p1', option_id: 'b', vote_count: 2 },
  ]);
  assert.deepEqual(result[0].poll_options.map((x) => [x.id, x.vote_count]), [['a', 3], ['b', 2]]);
  assert.equal(result[0].total_votes, 5);
});

test('ignores malformed, negative and unsafe counts and defaults missing options to zero', () => {
  const result = attachPollVoteCounts([{ id: 'p', poll_options: [{ id: 'o', position: 0 }] }], [
    { poll_id: 'p', option_id: 'o', vote_count: -1 },
    { poll_id: 'p', option_id: 'o', vote_count: Number.MAX_SAFE_INTEGER + 1 },
    { poll_id: 'p', option_id: 'x', vote_count: 7 },
  ]);
  assert.equal(result[0].poll_options[0].vote_count, 0);
  assert.equal(result[0].total_votes, 0);
});


test('supports multi-select poll totals as unique voters and preserves caller selections', () => {
  const result = attachPollVoteCounts([{ id: 'multi', allow_multiple: true, poll_options: [{ id: 'a', position: 0 }, { id: 'b', position: 1 }] }], [
    { poll_id: 'multi', option_id: 'a', vote_count: '3', selected_by_me: true, voter_count: '4' },
    { poll_id: 'multi', option_id: 'b', vote_count: '2', selected_by_me: false, voter_count: '4' },
  ]);
  assert.equal(result[0].total_votes, 4);
  assert.equal(result[0].poll_options[0].selected_by_me, true);
  assert.equal(result[0].poll_options[1].selected_by_me, false);
  assert.equal(result[0].poll_options[0].vote_count + result[0].poll_options[1].vote_count, 5);
});
