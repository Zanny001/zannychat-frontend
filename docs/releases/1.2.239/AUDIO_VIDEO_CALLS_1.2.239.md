# ZannyChat Audio/Video Calls — Frontend 1.2.239

## Native build requirements

- The native call implementation uses `react-native-webrtc` and its Expo config plugin.
- The current frontend declares Expo SDK 57, `react-native-webrtc` 124.0.7 and `@config-plugins/react-native-webrtc` 15.0.2.
- These pinned dependencies and source-level checks do not prove that the generated Android or iOS projects compile or operate correctly.
- Expo Go does not provide this project's custom native WebRTC module. Use a compatible custom development build or standalone native build containing the configured native module.
- After native dependency, config-plugin, permission or app-scheme changes, rebuild and install the native application. A web deployment does not update installed Android or iOS applications.

## Background and operating-system limitations

- WebRTC media sessions require an active native application process and valid microphone/camera permissions.
- Do not assume an active call will continue uninterrupted when the app is backgrounded, suspended, terminated, or affected by operating-system resource management.
- Reliable incoming-call presentation while backgrounded or terminated requires platform-specific notification and native integration, plus device and OS testing.
- Push notification delivery is not proof that a call can automatically establish media in the background.
- Assess Android and iOS separately, including lock screen, permission denial/retry, notification interaction, audio focus, interruptions, app switching, and process termination.
- Record any platform-specific restrictions and unsupported scenarios before making a production support claim.

## Network and connectivity

- TURN credentials must be generated server-side; the shared secret must never be embedded in the frontend.
- STUN-only fallback does not guarantee connectivity across all carrier networks, NAT types, firewalls or VPNs.
- Verify TURN reachability and real audio/video connectivity using separate devices on different networks.
- The frontend contains caller-side ICE restart/recovery logic and network-status messaging. Its source contract tests do not prove that ICE restart negotiation succeeds in every real network condition.
- The attachment-cleanup and call-invitation backend workers have separate database and operational prerequisites; do not manually run production workers without reviewed approval.

## Required release evidence

- Successful clean Android native build using the release dependency set.
- Successful clean iOS native build using the release dependency set.
- Physical-device incoming and outgoing audio/video call tests on both platforms.
- Permission grant, denial and retry tests.
- Foreground, background, lock-screen and terminated-app notification behavior assessment.
- Network changes, ICE failure/restart, call termination and recovery tests.
- Device models, OS versions, build identifiers and relevant logs recorded.
- TURN connectivity verified without exposing credentials.

## Current status

**NOT CERTIFIED FOR PRODUCTION.**

The current release session has source-level call recovery contract tests, but clean SDK 57 Android/iOS build evidence and physical-device call smoke-test evidence have not been supplied. Background-call behavior is not certified. Keep the native WebRTC readiness gate blocked until the required evidence is collected and reviewed.
