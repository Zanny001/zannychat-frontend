/** Contacts excluded by Story privacy must never be presented as eligible recipients. */
export function filterEligibleStatusAudienceContacts(contacts = [], excludedUsers = []) {
  const excludedIds = new Set((Array.isArray(excludedUsers) ? excludedUsers : [])
    .map((row) => typeof row === 'string' ? row : row?.excluded_user_id)
    .filter((id) => typeof id === 'string' && id.trim())
    .map((id) => id.trim()));
  return (Array.isArray(contacts) ? contacts : []).filter((contact) =>
    typeof contact?.id === 'string' && contact.id.trim() && !excludedIds.has(contact.id.trim()));
}

export function removeExcludedStatusAudienceIds(selectedIds = [], excludedUsers = []) {
  const excludedIds = new Set((Array.isArray(excludedUsers) ? excludedUsers : [])
    .map((row) => typeof row === 'string' ? row : row?.excluded_user_id)
    .filter((id) => typeof id === 'string' && id.trim())
    .map((id) => id.trim()));
  return [...new Set((Array.isArray(selectedIds) ? selectedIds : [])
    .filter((id) => typeof id === 'string' && id.trim())
    .map((id) => id.trim())
    .filter((id) => !excludedIds.has(id)))];
}
