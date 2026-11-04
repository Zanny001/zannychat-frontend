/** Filter privacy contacts by their display name or stable account identifier. */
export function filterStatusContacts(contacts, query) {
  const rows = Array.isArray(contacts) ? contacts : [];
  const needle = String(query ?? '').trim().toLocaleLowerCase();
  if (!needle) return rows;
  return rows.filter((contact) => {
    const name = String(contact?.name ?? '').toLocaleLowerCase();
    const id = String(contact?.id ?? '').toLocaleLowerCase();
    return name.includes(needle) || id.includes(needle);
  });
}
