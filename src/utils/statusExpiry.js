/** Return true only while a status has a valid, future expiry timestamp. */
export function isStatusActiveAt(status, nowMs = Date.now()) {
  if (!status || typeof status.expires_at !== 'string' || !status.expires_at.trim()) return false;
  const expiryMs = Date.parse(status.expires_at);
  return Number.isFinite(expiryMs) && expiryMs > nowMs;
}

/** Remove expired or malformed status rows from an already-loaded feed. */
export function removeExpiredStatuses(statuses, nowMs = Date.now()) {
  if (!Array.isArray(statuses)) return [];
  return statuses.filter((status) => isStatusActiveAt(status, nowMs));
}
