/** Filter a group roster by display name and optional admin/member role. */
export function filterGroupMembers(members, query = '', role = 'all') {
  const source = Array.isArray(members) ? members : [];
  const needle = String(query || '').trim().toLocaleLowerCase();
  return source.filter((member) => {
    const name = String(member?.profile?.name || 'ZannyChat member').toLocaleLowerCase();
    const matchesName = !needle || name.includes(needle);
    const matchesRole = role === 'all' || (role === 'admins' ? Boolean(member?.isAdmin) : role === 'members' ? !member?.isAdmin : true);
    return matchesName && matchesRole;
  });
}
