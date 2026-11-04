/** Return only contacts whose current exclusion state differs from the requested state. */
export function planStatusExclusionChanges(contacts, excludedUsers, shouldExclude) {
  const rows = Array.isArray(contacts) ? contacts : [];
  const excluded = new Set((Array.isArray(excludedUsers) ? excludedUsers : []).map((row) => String(row?.excluded_user_id ?? '')));
  const seen = new Set();
  return rows.filter((contact) => {
    const id = String(contact?.id ?? '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return excluded.has(id) !== Boolean(shouldExclude);
  });
}
