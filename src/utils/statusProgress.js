/** Convert elapsed time into a safe 0–100 Status progress percentage. */
export function getStatusProgressPercent(elapsedMs, durationMs) {
  const elapsed = Number(elapsedMs);
  const duration = Number(durationMs);
  if (!Number.isFinite(elapsed) || elapsed <= 0) return 0;
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(100, Math.max(0, (elapsed / duration) * 100));
}
