# Native Calling and Creator LIVE Device QA

This checklist is the release gate for the advanced calling / creator LIVE work. CI and simulator compilation are necessary but do not prove OS call-surface behavior or real push delivery.

## Safety and test setup

- Use two physical devices and two test accounts; do not use production users for destructive call tests.
- Confirm both devices are signed in, have current native binaries containing `expo-callkit-telecom` and `ZannyChatNativeCallMapping`, and have notification and microphone permissions.
- Configure the backend with the LiveKit SFU URL and server-side API credentials, plus the correct APNs and FCM credentials. Never put LiveKit API secrets or push-provider private keys in the mobile bundle.
- Confirm the required Supabase migrations are applied to a dedicated test project before exercising schema-dependent flows. Do not run `db push` against production as part of QA.
- Record device model, OS version, app build, backend commit, push environment (APNs sandbox/production), timestamps, and server call ID for each test.

## Android physical-device matrix

| Scenario | Procedure | Expected result |
|---|---|---|
| Incoming voice | Device B backgrounded; A places voice call | B receives push and Telecom incoming UI; ringtone plays; caller hears ringback |
| Incoming video | Repeat with video | Incoming UI identifies video; ringtone and ringback play; video connects after answer |
| Foreground decline | B declines in app | Both UIs close; session becomes declined; no duplicate terminal notification |
| Native decline | B declines from Android Telecom UI | Signed native event updates server; A's call UI ends |
| Caller cancellation | A cancels while B is ringing | Server session becomes cancelled; B's ringing UI is dismissed while its native session is alive |
| No answer | Let invitation expire | Server session becomes missed; UI closes and call history is consistent |
| Active-call remote end | Answer, then end from the other device | Both call surfaces close and session becomes ended |
| Background process pressure | Start call, background app, allow ordinary OS background lifecycle | Active call remains controllable and audio continues |
| Process death / cold-start push | In a controlled test, terminate the app process without force-stopping, then deliver remote end | Record whether Android restores the original Telecom session; do not assume encrypted mapping alone restores a live Telecom control scope |
| Force-stop | Force-stop the app during a test call, then attempt remote end | Record platform behavior separately; Android may suppress delivery until user relaunches |
| Sign-out cleanup | Register FCM, then sign out on that device | Device token is removed; global sign-out removes all account tokens |

**Android limitation:** the upstream Telecom call registry and call-control scope are process-local. Persisted encrypted mapping preserves the server call ID and signed credential, but does not recreate an expired native Telecom control scope after a cold start. A failed cold-start dismissal is a release blocker for any promise of guaranteed remote OS-surface dismissal in that condition.

## iOS physical-device matrix

| Scenario | Procedure | Expected result |
|---|---|---|
| Incoming voice/video | Device B backgrounded; A places call | PushKit delivery reports CallKit incoming call; ringtone and ringback work |
| Native decline | Decline from CallKit | Signed event reaches backend and caller is notified |
| Local cancel | Caller ends outgoing call from CallKit | Caller-scoped token marks ringing session cancelled |
| Unanswered | Allow CallKit timeout / no answer | Server session becomes missed |
| Remote end | Answer then end from other device | CallKit action closes the local surface and backend session ends |
| Relaunch recovery | Terminate app process while call is active, then exercise CallKit end action / PushKit call-ended path | Keychain mapping resolves server call ID and signed credential; no reliance on in-memory JS state |
| APNs alert fallback | Disable/withhold VoIP end path in test and send terminal alert | Visible standard APNs alert may appear; do not treat it as guaranteed immediate CallKit dismissal |
| Sign-out cleanup | Register PushKit and APNs alert tokens, then sign out | Both device token types are removed; global sign-out removes all account tokens |

## Audio and media checks

- Confirm the bundled incoming ringtone and outgoing ringback are audible, correctly loop, stop on answer/end, and do not overlap with notification sounds.
- Verify Bluetooth, wired headset, speakerphone, mute/unmute, audio-route changes, and interruption recovery.
- Verify microphone/camera permission denial produces a clear recoverable UI state.
- Confirm WebRTC/LiveKit ICE connectivity on Wi-Fi and mobile data, including a restrictive NAT/network where TURN is required.

## Group calls and creator LIVE

- Verify group-call creation, invite, join, leave, participant limit, reconnect, and final participant cleanup.
- Verify server admission rejects capacity overflow atomically and cannot be bypassed by simultaneous joins.
- Verify creator LIVE start/stop, audience join/leave, comments, reactions, moderation/reporting, and reconnect.
- Confirm non-members cannot obtain a room token and that token grants match the requested room/role.
- Test at least one multi-device session with the configured LiveKit SFU; mocked token tests are not sufficient.

## Evidence and release decision

For every row, capture pass/fail, timestamp, device/OS/build, server call ID or LIVE room ID, and relevant backend/provider logs with credentials redacted.

Release remains blocked until:
1. Android and iOS physical-device matrices pass or documented platform limitations are explicitly accepted.
2. Real APNs VoIP, APNs alert, and FCM registration/delivery are verified in the intended environments.
3. LiveKit voice/video, group-call, and creator LIVE flows pass against the configured SFU.
4. The pending Supabase migration set is reviewed and explicitly approved before production application.
5. iOS native Xcode compilation and final Android native build are completed for the intended release binaries.

This document is a test plan only. It does not authorize deployment, production database changes, pull-request merging, or release builds.
