# WebRTC SDK 57 Native Validation

**VALIDATED: NO**

This document is the release evidence record for the native WebRTC implementation.
Static source checks and JavaScript tests do not establish native compatibility.

## Implementation under test

- Expo SDK: 57.0.32
- React Native: 0.86.3
- Native WebRTC module: `@livekit/react-native-webrtc@150.1.1`
- Expo config plugin: `@config-plugins/react-native-webrtc@15.0.2`
- Native call integration: `expo-callkit-telecom@1.0.1`

## Required evidence before changing VALIDATED to YES

- [ ] Clean Android native build from the exact release commit, with build logs and artifact SHA-256 recorded.
- [ ] Clean iOS native build from the exact release commit, with build logs and artifact identity recorded.
- [ ] Install the Android artifact on a physical Android device and complete outgoing and incoming audio calls.
- [ ] Complete outgoing and incoming video calls, including camera permission denial and recovery.
- [ ] Install the iOS artifact on a physical iPhone and complete outgoing and incoming audio calls.
- [ ] Complete outgoing and incoming video calls, including microphone/camera permission denial and recovery.
- [ ] Verify mute, speaker/audio-route changes, camera switch, hang-up, remote hang-up, network interruption/recovery, and app background/foreground behavior on both platforms.
- [ ] Record device models, OS versions, commit SHA, build IDs, test date, and pass/fail results.
- [ ] Review call-related crash and backend signaling logs for the test window.

## Current status

No clean Android and iOS build artifacts and no complete physical-device call smoke-test evidence are attached to this repository record yet. The native compatibility release gate must remain blocked until all required evidence is recorded and independently reviewed.

Do not change **VALIDATED: NO** to **VALIDATED: YES** based only on dependency declarations, Expo prebuild output, simulator results, or static tests.
