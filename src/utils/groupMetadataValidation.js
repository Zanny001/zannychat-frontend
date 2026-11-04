/** Normalize and validate group metadata before sending it to the API. */
export function validateGroupMetadata(input = {}) {
  const name = String(input?.name ?? '').trim();
  const topic = String(input?.topic ?? '').trim();
  const description = String(input?.description ?? '').trim();
  const adminOnlyMessages = Boolean(input?.adminOnlyMessages);
  const errors = [];

  if (!name) errors.push('Enter a group name.');
  if (name.length > 80) errors.push('Group name must be 80 characters or fewer.');
  if (topic.length > 80) errors.push('Group topic must be 80 characters or fewer.');
  if (description.length > 500) errors.push('Group description must be 500 characters or fewer.');
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(name + topic + description)) {
    errors.push('Remove unsupported control characters from group details.');
  }

  return {
    ok: errors.length === 0,
    errors,
    value: { name, topic, description, adminOnlyMessages },
  };
}
