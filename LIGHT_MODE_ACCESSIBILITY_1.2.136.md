# Light mode and accessibility — 1.2.136

- Added persisted System / Light / Dark appearance preference. System mode follows the OS color scheme; the existing mood palette remains supported in dark mode.
- Added persisted Standard / Large / Extra large typography scaling through shared theme typography tokens.
- Added a persisted higher-contrast preference that strengthens supporting text and interface boundaries in both modes.
- Added labeled radio-style appearance and text-size choices, switch labels/hints, and clear selected states for screen readers.
- Existing React Native text controls continue to respect the device's font scaling unless a component explicitly opts out.

Validation is source-level. A full Expo production build, contrast review of every screen (including hard-coded colors), VoiceOver/TalkBack tests, and physical-device verification remain release gates.
