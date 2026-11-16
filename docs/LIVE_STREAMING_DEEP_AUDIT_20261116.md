# ZannyChat LIVE Streaming Deep Audit — 2026-11-16

## Executive summary

A confirmed browser-client integration defect was found in the remote media path. The web screen treated a LiveKit `RemoteTrack` as if it owned a `participant` property. In the installed LiveKit JS SDK (v2.23.0), `RemoteTrack` extends the base `Track` and does not expose that property; the room's `TrackSubscribed` event supplies the `RemoteParticipant` as a separate third callback argument. The existing code dereferenced `track.participant` while registering audio participants and while rendering remote video tiles. This can throw as soon as remote creator/guest media is subscribed, preventing the remote stage from rendering.

The browser stage also rendered the local publisher in a separate full-width frame and remote publishers in a separate grid. This made a creator-plus-guest broadcast visually inconsistent and failed to present one shared stage.

A further state gap existed for remote camera mute/unmute and track unpublish events. The web screen listened for subscribe/unsubscribe only, so camera state changes could leave stale/black video tiles and suppress the correct audio-only state.

The current remediation is isolated to the frontend browser LIVE client and its regression contracts. The production database already has the guest-admission migration and a correct `join_live_stream` definition. No Supabase schema or RLS changes are required.

## Findings and remediation

| Area | Finding | Remediation |
|---|---|---|
| Browser remote video | Code dereferenced `track.participant`; LiveKit JS v2.23.0 RemoteTrack has no participant property. The event provides participant separately. | Store `{ track, publication, participant }` from `TrackSubscribed(track, publication, participant)`; pass participant to the video tile. Remove all `track.participant` access. |
| Browser remote audio | Audio subscription also dereferenced `track.participant`, risking a runtime exception during audio setup. | Use the event's participant argument for identity/name and audio-only state. |
| Combined stage | Local creator/guest preview was a separate oversized frame from remote participants. | Render the local publisher and all remote publishers in one responsive, labelled 16:9 stage grid. Keep the local video mount stable while camera is toggled. |
| Remote camera lifecycle | Mute/unmute/unpublish changes were not represented in stage state. | Handle `TrackMuted`, `TrackUnmuted`, and `TrackUnpublished`; remove stale video tiles and restore them when a muted camera resumes. |
| Remote subscription failure | Failed track subscriptions were not surfaced to the user. | Listen for `TrackSubscriptionFailed` and show a recoverable, participant-specific message. |
| Subscription policy | LiveKit auto-subscribe is enabled by default but was implicit. | Pass `{ autoSubscribe: true }` explicitly to browser room connection. |

## Backend and Supabase verification

- Backend LIVE token issuance explicitly sets `canSubscribe: true` for all roles, and sets publishing permission from the server-authorized role.
- The current production `public.join_live_stream(uuid, uuid)` function returns `guest` only when guest participation is enabled and an accepted guest invitation exists. It locks the stream row, enforces audience capacity, and enforces the five-guest stage limit.
- Production migration history includes `20261114123057_live_stage_guest_capacity`.
- Guest approval is creator-only; the backend checks the requester remains a joined viewer and checks block relationships before accepting.
- LIVE tables remain backend-only with RLS enabled and no broad client policies. No RLS relaxation or database migration is proposed.
- A later read-only production snapshot found one active public LIVE with guest participation enabled and two joined database participants (one creator and one guest). No viewer row was present in that snapshot. This confirms the database admission state, not LiveKit media delivery; no RTP/track telemetry is exposed by these database checks.

## Production log observations

For the preceding 24-hour query window, the Supabase edge log aggregation showed successful (HTTP 200) reads for LIVE streams, participants, comments, reactions, invitations and replay records. It showed seven successful `join_live_stream` RPC calls, one stream creation, one guest invitation insert, one guest invitation update, one successful stream end, and one HTTP 403 stream-end attempt. The 403 is consistent with creator-only end authorization and is not by itself evidence of a fault.

These logs are database/API evidence only. They do not contain LiveKit RTP/media delivery telemetry and therefore cannot prove that a viewer actually received video or audio. A targeted read-only query found one HTTP 403 call to `end_live_stream`, followed 26 seconds later by an HTTP 200 call. The function correctly rejects a non-creator caller; the available logs do not establish which UI action or account produced the rejected call. The active stream snapshot shows a creator and guest joined, but not a viewer, so the reported viewer playback issue remains unverified at the media layer.

## Required acceptance tests

### Browser — creator and viewer
- Start a public LIVE as Account A with camera and microphone enabled.
- Join as Account B in a separate browser/device.
- Confirm Account B sees and hears Account A without a refresh.
- Confirm Account A sees and hears Account B only after guest approval and guest token handoff.
- Confirm the stage displays both participants in one responsive 16:9 layout with clear names.
- Toggle each participant's camera off/on and microphone mute/unmute; confirm no stale black tile, duplicate tile, or lost stage.
- Confirm a camera-muted participant remains represented as audio-only.
- Test guest removal/demotion; the guest must lose publishing rights but remain subscribed as a viewer.
- Test reconnect and participant departure; stale tiles must clear.
- Confirm ordinary viewers cannot publish.

### Native Android/iOS
- Repeat creator/viewer and guest promotion flows on two physical devices.
- Verify camera/microphone permission prompts, audio routing, camera toggles, remote audio, stage sizing, and guest demotion.
- Test Android 10/11 compatibility and a current Android version.

### Operational and safety
- Verify comments, reactions, reports, moderator permissions, spotlight, replay start/stop/playback, and stream end in a real session.
- Verify a non-creator cannot approve requests, manage guests, mute/spotlight guests, or end the stream.
- Verify blocked users and non-invitees cannot join follower-only/private streams.
- Verify room cleanup and participant presence after explicit leave and network loss.

## Release status

- Frontend browser fix and static regression contracts are committed on `fix/livekit-remote-track-participant-stage`.
- CI is required before this change is considered validated.
- Real two-account browser testing and two-device native testing remain release gates.
- No Supabase schema, data, RLS, or storage policy changes were made.
- No production deployment or end-to-end media success is claimed.


## Additional audit finding — viewer presence heartbeat

A second confirmed browser defect was identified during the renewed review. The web heartbeat effect required the UI status to equal the exact string `Connected`, but viewers are assigned `Connected · waiting for the creator`. That meant connected waiting viewers skipped periodic presence heartbeats. The effect now checks the actual LiveKit room connection state, sends heartbeats on initial connection and reconnect, and removes its event listeners on cleanup. A regression contract was added.

This fix improves participant presence accuracy; it does not itself establish that RTP media is flowing. Real viewer playback remains an acceptance gate.


## Renewed production security and operational review

- All 13 LIVE tables inspected have RLS enabled. Direct SELECT privileges are denied to both `anon` and `authenticated`; `service_role` has the expected backend access. The advisor's "RLS enabled, no policy" INFO findings are therefore consistent with the intentional backend-only data-access model, not a reason to add permissive client policies.
- The `live-replays` Storage bucket is private, restricted to MP4, and has a 48,000,000-byte object limit.
- The inspected LIVE SECURITY DEFINER functions use an empty `search_path` and have EXECUTE grants only for `service_role` (besides the owner). The reaction-breakdown function is invoker-security and also service-role-only.
- The general Supabase security advisor reports 28 authenticated-executable SECURITY DEFINER functions across the project and disabled leaked-password protection. These are broader project findings, not evidence that the LIVE functions are exposed. They should receive a separate project-wide review; do not loosen or broadly change LIVE permissions to silence the advisor.
- The performance advisor reports unused indexes, including some LIVE tables. With very small LIVE row counts and no meaningful sustained production traffic, this is not a safe basis for dropping indexes.
- Production currently has nine LIVE stream records, one active public stream, 14 participant records, four accepted guest invitations, 11 persisted reactions, one comment, and zero replay rows / zero objects in the private replay bucket at the time of the snapshot.
- A single end-stream RPC 403 was followed by a successful 200. The end/leave UI previously navigated away even when the request failed, making the broadcast appear ended despite server rejection. Both native and browser handlers now retain the room, reset the retry guard, and surface the error when the server rejects end/leave.

## Additional remediation

| Area | Finding | Remediation |
|---|---|---|
| End/leave reliability | Native client swallowed end/leave errors and navigated away. Browser client showed an error but still disconnected and navigated away. | Both clients now navigate only after the backend confirms success. On failure they remain in the room, restore retry state and show an actionable error. Regression contract added. |
| Production permissions | Advisor reports LIVE tables with RLS enabled but no policies. | Verified direct `anon` and `authenticated` SELECT privileges are false and backend `service_role` access is true. Retain backend-only access; do not add broad policies. |
| Replay availability | No replay rows or storage objects exist, despite configured worker code and private bucket. | End-to-end Egress start/stop/webhook/finalization/playback/deletion is still a release gate. No recording was fabricated or created during this audit. |
