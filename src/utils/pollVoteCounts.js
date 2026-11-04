/** Convert aggregated SQL vote rows into per-poll counts without exposing voter IDs. */
export function attachPollVoteCounts(polls, rows) {
  const counts = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row.poll_id !== 'string' || typeof row.option_id !== 'string') continue;
    const count = Number(row.vote_count);
    if (!Number.isSafeInteger(count) || count < 0) continue;
    if (!counts.has(row.poll_id)) counts.set(row.poll_id, new Map());
    counts.get(row.poll_id).set(row.option_id, {
      vote_count: count,
      selected_by_me: row.selected_by_me === true,
      voter_count: Number.isSafeInteger(Number(row.voter_count)) && Number(row.voter_count) >= 0 ? Number(row.voter_count) : null,
    });
  }
  return (Array.isArray(polls) ? polls : []).map((poll) => {
    const optionCounts = counts.get(poll.id) || new Map();
    const poll_options = [...(poll.poll_options || [])]
      .sort((a, b) => a.position - b.position)
      .map((option) => ({ ...option, ...(optionCounts.get(option.id) || { vote_count: 0, selected_by_me: false, voter_count: null }) }));
    const aggregatedVoters = poll_options.map((option) => option.voter_count).find((value) => value !== null);
    const total_votes = aggregatedVoters === undefined ? poll_options.reduce((sum, option) => sum + option.vote_count, 0) : aggregatedVoters;
    return { ...poll, poll_options, total_votes };
  });
}
