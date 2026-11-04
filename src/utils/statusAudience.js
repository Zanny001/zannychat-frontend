export const STATUS_AUDIENCES = Object.freeze(['contacts', 'only_me', 'selected_contacts']);

export function normalizeStatusAudience(audience, selectedContactIds = []) {
  const selectedIds = [...new Set((Array.isArray(selectedContactIds) ? selectedContactIds : [])
    .filter((id) => typeof id === 'string' && id.trim())
    .map((id) => id.trim()))];
  if (!STATUS_AUDIENCES.includes(audience)) throw new Error('Choose a valid status audience.');
  if (audience === 'selected_contacts' && selectedIds.length === 0) {
    throw new Error('Choose at least one contact who can see this status.');
  }
  if (audience !== 'selected_contacts' && selectedIds.length) {
    throw new Error('Selected contacts are only valid for the selected-contacts audience.');
  }
  return selectedIds;
}
