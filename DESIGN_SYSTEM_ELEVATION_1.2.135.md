# App-wide Design System Elevation — 1.2.135

## What changed
- Added semantic theme tokens for success, warning, focus, elevated/glass surfaces, subtle borders, scrim, and shadows across all existing mood palettes.
- Added shared layout tokens for minimum touch target, control height, header height, content width, and section spacing.
- Increased body/caption/small typography readability and line spacing consistently across screens using shared typography tokens.
- Added a shared elevated parent to GlassCard so card shadows can render without clipping the glass surface's own overflow.
- Increased the shared header height and made its sizing use the common layout tokens.
- Added design-system regression tests across every mood and the shared accessibility/layout contracts.

## Validation
Run `npm run test:unit` and `npm run audit:release`. Platform-specific appearance, dynamic type behavior, and touch target verification still require Android/iOS device testing.

## Release status
Source-only change. No production deployment or live Supabase mutation performed.
