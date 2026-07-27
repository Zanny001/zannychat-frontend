// Converts a "#RRGGBB" hex color to an "rgba(r, g, b, a)" string. Used
// throughout the glass system to tint a blur toward the active mood's
// surface color instead of a fixed gray.
export function hexToRgba(hex, alpha = 1) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3 ? clean.replace(/./g, (c) => c + c) : clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
