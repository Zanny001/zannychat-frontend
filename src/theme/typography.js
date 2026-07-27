// Two-face system: Space Grotesk carries personality on anything
// display-sized or numeric (it has a technical, signal-like character
// that fits a "threads meeting" identity); Manrope handles everything
// meant to be read at length — messages, body copy, form fields —
// where warmth and legibility matter more than character.
//
// Both are loaded in theme/fonts.js via useFonts(). Until they finish
// loading, App.js holds the splash screen up rather than showing a
// flash of the system font.

export const typography = {
  display: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, letterSpacing: -0.6 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 23, letterSpacing: -0.3 },
  heading: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 18, letterSpacing: -0.1 },
  numeric: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 34, letterSpacing: -0.4 },
  body: { fontFamily: 'Manrope_500Medium', fontSize: 15.5, lineHeight: 21 },
  bodyStrong: { fontFamily: 'Manrope_700Bold', fontSize: 15.5, lineHeight: 21 },
  caption: { fontFamily: 'Manrope_500Medium', fontSize: 13, lineHeight: 18 },
  small: { fontFamily: 'Manrope_600SemiBold', fontSize: 11, letterSpacing: 0.3 },
};
