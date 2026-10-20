// Bounded client-side backoff prevents repeated manual retries from hammering
// storage/network while preserving an explicit retry path for the user.
export const ATTACHMENT_RETRY_BASE_MS = 15_000;
export const ATTACHMENT_RETRY_MAX_MS = 15 * 60_000;

export function attachmentRetryDelayMs(attempts) {
  const count = Number.isInteger(attempts) && attempts > 0 ? Math.min(attempts, 100) : 1;
  return Math.min(ATTACHMENT_RETRY_MAX_MS, ATTACHMENT_RETRY_BASE_MS * (2 ** Math.min(count - 1, 20)));
}

export function getAttachmentNextRetryAt(attempts, now = Date.now()) {
  return new Date(now + attachmentRetryDelayMs(attempts)).toISOString();
}

export function isAttachmentRetryDue(item, now = Date.now()) {
  if (!item?.nextRetryAt) return true; // Existing queue entries remain retryable.
  const dueAt = Date.parse(item.nextRetryAt);
  return !Number.isFinite(dueAt) || dueAt <= now;
}
