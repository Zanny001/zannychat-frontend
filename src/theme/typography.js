// Shared type scale. Keeping this in one place makes it trivial to swap
// in a custom font later (Settings > Appearance > Font is a natural
// Phase-1.5 addition once a font is bundled via expo-font).

export const typography = {
  display: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  bodyStrong: { fontSize: 15, fontWeight: '600' },
  caption: { fontSize: 13, fontWeight: '400' },
  small: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3 },
};
