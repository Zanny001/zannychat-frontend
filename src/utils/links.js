// Deliberately simple — catches the overwhelming majority of real
// shared links (http/https, common TLDs) without pulling in a full URL-
// parsing grammar for edge cases that don't matter for "should this
// message show a preview card."
const URL_PATTERN = /https?:\/\/[^\s]+/i;

export function extractFirstUrl(text) {
  if (!text) return null;
  const match = text.match(URL_PATTERN);
  return match ? match[0].replace(/[.,!?)]+$/, '') : null; // trims trailing punctuation a sentence would add
}
