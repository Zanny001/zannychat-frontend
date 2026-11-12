# ZannyChat Royal Neon 5D Design System

## Approved direction

Royal Neon is the first-run visual direction for ZannyChat: deep obsidian surfaces, royal violet, electric aqua, aurora blue, rose and champagne highlights. The system is original to ZannyChat and uses playful, camera-forward visual cues without copying another messaging product.

## Colour architecture

- Presets: Royal Neon, Ocean, Emerald, Rose Gold, Sunset, Ember, Tide, Aurora and Dawn.
- Custom colours: users can set Signal, Thread and Highlight hex values in Settings.
- Custom values are validated and stored locally with AsyncStorage. Invalid values are rejected without replacing the current palette.
- Semantic surface, text, border, status and danger tokens remain owned by the theme system.
- Light-mode primary accents are darkened until they meet a 4.5:1 contrast ratio against white. Accent colours are darkened to at least 4.5:1 for readable text; foregrounds are selected for contrast on both bright and dark custom accents.
- User appearance preference remains independent: System, Light and Dark are all supported.

## Depth and motion

- Glass cards use blurred/tinted surfaces, elevated shadows, a specular top edge and a subtle inner highlight.
- Main navigation uses a floating glass tab bar with a restrained accent halo around the selected destination.
- Selected tab icons use a spring scale transition.
- The shared reduced-motion preference disables the tab spring animation.

## Performance and accessibility guardrails

- Keep blur and glow subtle; never make blur a required source of text contrast.
- Avoid continuous background animation and expensive per-frame gradients.
- Respect the operating-system reduced-motion preference.
- Keep touch targets, screen-reader labels, existing route names and tab semantics intact.
- Verify the experience on Android 10 / lower-powered devices before release.
- This design-system work does not claim literal extra dimensions; “5D-inspired” describes layered depth, responsive motion and optional sensory feedback.

## Current implementation scope

- Theme presets and validated custom palette foundation.
- Settings controls for Signal, Thread and Highlight.
- Contrast-aware dynamic light-mode accents.
- Optional 3D glass-card glow.
- Floating neon glass navigation with reduced-motion-aware spring feedback.

This document records the foundation only. Screen-by-screen redesign and full device validation remain separate completion gates.
