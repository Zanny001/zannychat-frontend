# WebRTC Native Validation — Expo SDK 57

**VALIDATED: NO**

Status: BLOCKED PENDING NATIVE BUILDS AND PHYSICAL-DEVICE TESTS

## Dependency configuration

- Expo: 57.0.31 (current frontend lockfile)
- React Native: 0.86.3
- `react-native-webrtc`: 124.0.7
- `@config-plugins/react-native-webrtc`: 15.0.2
- Plugin peer requirement checked against npm metadata: `expo >=56`.

The peer requirement is compatible on paper with Expo 57, but it does not establish that the native integration builds or runs correctly with this exact project.

## Required evidence

- [ ] Clean Android native build completed successfully.
- [ ] Clean iOS native build completed successfully.
- [ ] Android physical-device outgoing and incoming call smoke tests passed.
- [ ] iOS physical-device outgoing and incoming call smoke tests passed.
- [ ] Microphone/camera permissions and denial/retry behavior tested.
- [ ] Network interruption, call termination, and reconnection behavior tested.
- [ ] Background, foreground, and operating-system interruption behavior assessed.
- [ ] Build logs, device/OS versions, and test results recorded.

No build logs or physical-device test evidence have been recorded here. Keep this gate blocked until the checklist is completed with real results.
