export function normalizePoll(question, options) {
  const q = String(question || '').trim();
  const values = (Array.isArray(options) ? options : []).map((v) => String(v || '').trim()).filter(Boolean);
  if (!q || q.length > 240) throw new Error('Poll question must be 1–240 characters.');
  if (values.length < 2 || values.length > 10) throw new Error('Add between 2 and 10 non-empty options.');
  if (values.some((v) => v.length > 120)) throw new Error('Each option must be 120 characters or fewer.');
  if (new Set(values.map((v) => v.toLocaleLowerCase())).size !== values.length) throw new Error('Poll options must be unique.');
  return { question: q, options: values };
}
