/** Apply a bulk action to the currently filtered Status audience contacts. */
export function updateSelectedAudienceIds(currentIds = [], matchingIds = [], select = true) {
  const current = [...new Set((Array.isArray(currentIds) ? currentIds : []).filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()))];
  const matching = new Set((Array.isArray(matchingIds) ? matchingIds : []).filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()));
  if (select) return [...new Set([...current, ...matching])];
  return current.filter((id) => !matching.has(id));
}
