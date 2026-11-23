// Converts a hex color to an rgba() string. Invalid input fails closed to
// transparent rather than throwing during render in shared UI components.
export function hexToRgba(hex, alpha = 1) {
  const clean = typeof hex === 'string' ? hex.trim().replace(/^#/, '') : '';
  const expanded = clean.length === 3
    ? clean.split('').map((channel) => channel + channel).join('')
    : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return 'rgba(0, 0, 0, 0)';

  const bigint = Number.parseInt(expanded, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const safeAlpha = Number.isFinite(Number(alpha))
    ? Math.min(1, Math.max(0, Number(alpha)))
    : 1;
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}
