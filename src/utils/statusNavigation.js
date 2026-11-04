import { isStatusActiveAt } from './statusExpiry.js';

/** Return the adjacent status in the current feed order, or null at either edge. */
export function getAdjacentStatus(statuses, currentId, direction, nowMs = Date.now()) {
  if (!Array.isArray(statuses) || !currentId || ![-1, 1].includes(direction)) return null;
  // A viewer can remain open while an item expires. Never navigate into an
  // expired or malformed status even if the next periodic feed prune has not run.
  const activeStatuses = statuses.filter((item) => item?.id && isStatusActiveAt(item, nowMs));
  const index = activeStatuses.findIndex((item) => item?.id === currentId);
  if (index < 0) return null;
  return activeStatuses[index + direction] || null;
}


/**
 * Navigate a grouped story chronologically within the current owner's updates.
 * Once that owner's sequence is exhausted, continue using the global feed order.
 */
export function getAdjacentStoryStatus(statuses, currentId, direction, nowMs = Date.now()) {
  if (!Array.isArray(statuses) || !currentId || ![-1, 1].includes(direction)) return null;
  const activeStatuses = statuses.filter((item) => item?.id && isStatusActiveAt(item, nowMs));
  const current = activeStatuses.find((item) => item?.id === currentId);
  if (!current) return null;
  const ownerId = current.user_id;
  if (ownerId) {
    const sameOwner = activeStatuses
      .filter((item) => item?.user_id === ownerId && item?.id)
      .slice()
      .sort((a, b) => {
        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();
        return (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0);
      });
    const index = sameOwner.findIndex((item) => item.id === currentId);
    const adjacent = index >= 0 ? sameOwner[index + direction] : null;
    if (adjacent) return adjacent;
  }
  return getAdjacentStatus(activeStatuses, currentId, direction, nowMs);
}

export const DEFAULT_STATUS_DURATIONS = Object.freeze({ text: 10000, image: 15000, video: 60000 });
export const MIN_STATUS_DURATION_MS = 5000;
export const MAX_STATUS_DURATION_MS = 60000;
export const STATUS_DURATION_STEP_MS = 5000;

/** Resolve a dwell time using saved preferences, safely falling back to defaults. */
export function getStatusDurationMs(status, preferences = DEFAULT_STATUS_DURATIONS) {
  const kind = status?.media_kind === 'video' ? 'video' : status?.media_kind === 'image' ? 'image' : 'text';
  const value = Number(preferences?.[kind]);
  if (!Number.isFinite(value)) return DEFAULT_STATUS_DURATIONS[kind];
  return Math.min(MAX_STATUS_DURATION_MS, Math.max(MIN_STATUS_DURATION_MS, value));
}

/** Change one content type's dwell time by a step while keeping it within bounds. */
export function adjustStatusDuration(preferences, kind, delta) {
  const key = ['text', 'image', 'video'].includes(kind) ? kind : 'text';
  const current = getStatusDurationMs({ media_kind: key }, preferences);
  const amount = Number(delta);
  if (!Number.isFinite(amount)) return { ...DEFAULT_STATUS_DURATIONS, ...preferences };
  const next = Math.min(MAX_STATUS_DURATION_MS, Math.max(MIN_STATUS_DURATION_MS, current + amount));
  return { ...DEFAULT_STATUS_DURATIONS, ...preferences, [key]: next };
}
