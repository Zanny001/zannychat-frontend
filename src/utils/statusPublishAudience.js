/** Revalidate selected-status recipients immediately before publishing.
 * UI selection can become stale if contacts or privacy exclusions change in another screen/device.
 */
export function resolveStatusPublishAudience(audience, selectedIds = [], contacts = [], exclusions = []) {
  if (audience !== 'selected_contacts') return [];
  const requested = [...new Set((Array.isArray(selectedIds) ? selectedIds : [])
    .filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()))];
  if (!requested.length) throw new Error('Choose at least one contact who can see this status.');
  const contactIds = new Set((Array.isArray(contacts) ? contacts : [])
    .map((contact) => contact?.id).filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()));
  const excludedIds = new Set((Array.isArray(exclusions) ? exclusions : [])
    .map((entry) => typeof entry === 'string' ? entry : entry?.excluded_user_id)
    .filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()));
  const eligible = requested.filter((id) => contactIds.has(id) && !excludedIds.has(id));
  if (eligible.length !== requested.length) {
    throw new Error('Your status audience changed. Review your selected contacts and Story privacy, then try again.');
  }
  return eligible;
}
