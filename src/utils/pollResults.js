/** Return a bounded, whole-number share of votes for a single-choice poll option. */
export function getPollOptionPercentage(optionVotes, totalVotes) {
  const votes = Number(optionVotes);
  const total = Number(totalVotes);
  if (!Number.isSafeInteger(votes) || votes < 0 || !Number.isSafeInteger(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((votes / total) * 100)));
}

/** Keep UI labels predictable even when older cached poll data is malformed. */
export function formatPollVoteSummary(optionVotes, totalVotes) {
  const percentage = getPollOptionPercentage(optionVotes, totalVotes);
  const votes = Number(optionVotes);
  const safeVotes = Number.isSafeInteger(votes) && votes >= 0 ? votes : 0;
  return { percentage, label: `${percentage}%`, votes: safeVotes };
}
