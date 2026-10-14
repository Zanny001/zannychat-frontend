# Chat appearance — 1.2.19

Adds a premium-styled Chat appearance screen accessible from Appearance & theme. Users can choose a mood-matched background or one of five dark conversation canvases. The selected canvas persists locally with AsyncStorage and is applied to the conversation screen on focus. The preview labels the choice as appearance-only; it does not imply end-to-end encryption or change message storage.

Validation: pure preference normalization and resolution are covered by dependency-free Node unit tests. Native layout, persistence on device, and screen-reader behavior still require Expo/device testing.
