export const LIVE_BROADCAST_MAX_DURATION_MS = 4 * 60 * 60 * 1000;
export const LIVE_BROADCAST_WARNING_MS = 10 * 60 * 1000;

export function getLiveBroadcastTimeRemaining(startedAt, now = Date.now()) {
  if (!startedAt) return null;
  const startedAtMs = Date.parse(startedAt);
  if (!Number.isFinite(startedAtMs)) return null;
  return Math.max(0, LIVE_BROADCAST_MAX_DURATION_MS - (now - startedAtMs));
}

export function formatLiveBroadcastTimeRemaining(remainingMs) {
  if (!Number.isFinite(remainingMs)) return '';
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}
