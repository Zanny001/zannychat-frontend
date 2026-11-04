/** Search the registered ZannyChat member directory without mutating server data. */
export function filterZannyMembers(members, query = '', onlineOnly = false) {
  const rows = Array.isArray(members) ? members : [];
  const normalizedQuery = String(query || '').trim().toLocaleLowerCase();
  return rows
    .filter((member) => member && typeof member.id === 'string' && member.id.length > 0)
    .filter((member) => !onlineOnly || member.online === true)
    .filter((member) => {
      if (!normalizedQuery) return true;
      const searchable = [member.name, member.status, member.username]
        .filter((value) => typeof value === 'string')
        .join(' ')
        .toLocaleLowerCase();
      return searchable.includes(normalizedQuery);
    })
    .slice()
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
}
