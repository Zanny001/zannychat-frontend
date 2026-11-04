/**
 * Apply client-side visibility safeguards to status rows.
 * This is a UI defense-in-depth filter, not a replacement for Supabase RLS.
 */
export function filterVisibleStatusRows(rows, viewerId, mutedOwnerIds = [], excludedOwnerIds = [], selectedStatusIds = [], nowMs = Date.now()) {
  if (!Array.isArray(rows)) return [];
  const muted = new Set(Array.isArray(mutedOwnerIds) ? mutedOwnerIds : []);
  const excluded = new Set(Array.isArray(excludedOwnerIds) ? excludedOwnerIds : []);
  const selected = new Set(Array.isArray(selectedStatusIds) ? selectedStatusIds : []);
  return rows.filter((row) => {
    if (!row?.id || !row?.user_id) return false;
    // Expiry is checked again at render/filter time because a cached or realtime
    // row can outlive the server query that originally returned it.
    const expiresAt = typeof row.expires_at === 'string' ? Date.parse(row.expires_at) : NaN;
    if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) return false;
    if (viewerId && row.user_id === viewerId) return true;
    if (row.audience === 'only_me') return false;
    if (row.audience === 'selected_contacts' && !selected.has(row.id)) return false;
    if (!['contacts', 'selected_contacts'].includes(row.audience)) return false;
    return !muted.has(row.user_id) && !excluded.has(row.user_id);
  });
}
