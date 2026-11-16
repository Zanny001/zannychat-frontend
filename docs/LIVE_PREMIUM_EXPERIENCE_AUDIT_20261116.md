# ZannyChat LIVE premium experience audit — 2026-11-16

## Scope and evidence standard

This audit reviews the current frontend LIVE hub, creator profile, native/web LIVE rooms and the authenticated backend LIVE routes. Existing code is evidence of implementation only; it is not proof of production operation. The reliability fixes in PR #86 are merged. Their source/contract checks passed, but real two-account browser and two-device native media acceptance remains a release gate.

## Existing product capabilities confirmed in source

- Public, follower-only and private broadcast creation; private invitations are drawn from existing chat contacts.
- Live discovery, Following and Public filters, creator follows, invitation inbox and replay collection.
- Optional approved guest stage, up to five guests, guest requests/invitations, creator moderation, mute, spotlight and demotion/removal.
- Seven reactions, comments, reporting, moderation queue, creator profile and impact milestones.
- Replay start/stop, processing state, signed playback and owner deletion paths.
- Backend role-based LiveKit token issuance, stream visibility/block checks, audience admission, presence heartbeat and private replay storage.

## Confirmed premium-product gaps

| Priority | Gap | Why it matters | Recommended work |
|---|---|---|---|
| P1 | LIVE discovery has only All / Following / Public filters and no search input; both public and followed stream endpoints cap results at 50 and provide no cursor. | Viewers cannot quickly find a broadcast by topic or creator, and active streams beyond the first 50 are not discoverable from this feed. | Add client search now; later add server-backed pagination, categories and ranked discovery only with an agreed schema and query contract. |
| P1 | Hub is a single long feed with a large broadcast composer before discovery. | The primary viewer task—finding and joining a LIVE—is visually secondary to creator setup. | Reorder the experience into a compact discovery header, featured/following rail, live cards, then a collapsible/secondary creator entry point. Preserve all current flows. |
| P1 | Creator profile summary shows basic totals and recent broadcasts/replays but not audience analytics. | Creators cannot evaluate reach, retention or broadcast quality. | Add measured analytics only after defining event collection and privacy/retention rules; do not invent watch-time or retention values from participant rows. |
| P1 | Stage controls are exposed as a dense cluster of small top-bar actions. | Creator, guest and viewer responsibilities are hard to distinguish on smaller devices. | Group creator tools into Studio controls; keep viewer actions separate; show role-specific labels, guest queue, connection state and clear confirmation for destructive actions. |
| P1 | Guest stage and audience are represented primarily as video tiles and generic participant actions. | Guests can confuse creator controls with their own controls; role transitions are not sufficiently legible. | Persistent role labels, creator-only Studio drawer, guest self-controls, request queue states, stage-capacity indicator and clear demotion state. |
| P2 | No source-backed category, scheduled event, PK, poll, gift or fan-club workflow is present in the inspected screens/routes. | These are meaningful engagement features, but must not be represented as working before service and safety design exist. | Plan categories/events first; defer PK, gifts, wallet, cash-out and fan-club economy until backend ledger, purchase verification, abuse controls and reconciliation are designed. |
| P1 | Replay UI can display pending/failure states, but production audit found no replay records or stored objects at audit time. | A replay control does not prove the recording pipeline works. | Keep recording-to-webhook-to-storage-to-signed-playback acceptance as a release gate; show retryable failure states and avoid presenting unavailable rows as playable. |

## Current implementation now merged into main

- Frontend PR #87's LIVE discovery improvements are merged, including client-side search across the returned stream feed and combined filters.
- The discovery API includes creator display names after the existing visibility/block filtering. Search remains client-side over the bounded response; it is not global search or pagination.
- Search composes with existing All / Following / Public filters and does not alter backend permissions or widen visibility.
- Collapsed the broadcast setup composer by default so discovery is the primary hub task; creators can expand the existing setup without losing any controls.
- Creator profile replay rows now open only when status is `ready`; starting/recording/processing/failed states are labelled and non-navigable, preventing viewers from opening an unavailable replay.
- Added automated tests for case-insensitive search, creator names, combined filters and empty/malformed input.

## Design direction

Use Crown Aurora: deep void navy, restrained violet/cyan accents and crown-gold only for premium emphasis. Keep video containers moderate and legible, use calm glass surfaces, strong creator/guest/viewer role hierarchy, accessible hit targets and reduced-motion support. Do not sacrifice text contrast or stage area for decorative effects.

## Release and safety gates

1. PR #86 reliability changes are merged; real-media acceptance must still pass before release.
2. Search is client-side over the server response; it does not imply complete global search or pagination.
3. No schema migration, RLS change, wallet balance, virtual gift purchase or cash-out is included in this premium pass.
4. Verify web and native layouts, screen readers, empty states, large text, dark/light themes and narrow screens before merging.


## Post-merge LIVE role and stage verification — 16 Nov 2026

- Frontend PR #86 (media lifecycle, remote-track subscription and server-role integration), #87 (LIVE discovery) and #89 (Creator Studio) are merged.
- Native and web LIVE derive creator controls from the server-issued `connection.role === 'creator'`; route parameters do not grant creator privileges. Guest publishing requires a server-issued guest role and `canPublish` permission. A demoted guest is returned to viewer mode.
- Creator Studio and guest-request controls are creator-only. Guest camera/microphone controls are scoped to the guest's own local publisher. Viewer controls remain limited to viewing, reactions, comments, reporting and requesting guest access.
- Native and web contract tests cover creator/guest role boundaries, track subscription, remote publisher stage layout, guest approval/demotion, moderation, replay controls, participant heartbeat and media lifecycle. These are automated source contracts, not proof of remote RTP delivery.
- The current production LIVE replay snapshot contains zero replay rows and zero objects in the private replay bucket. A complete Egress-to-storage-to-playback test remains outstanding.
- Creator Studio metrics are derived from the authenticated participant list and labelled “Viewers listed”; they are not total audience, reach, watch time, retention or earnings.


## LIVE replay implementation and production security reassessment — 2026-11-17

The earlier production note that there were zero replay rows/objects remains accurate. A fresh backend source review confirms that the Egress-to-private-storage implementation exists; the remaining blocker is runtime/configuration and end-to-end evidence, not an absent code path.

### Implementation confirmed in backend source

- `POST /live/:streamId/replays/start` is authenticated and creator-only, requires a live stream, feature flags and configured Egress/Supabase S3 credentials, reserves a bounded quota, starts LiveKit `StartEgress`, persists the Egress ID and schedules a five-minute stop.
- The Egress request uses a grid template, MP4 output (LiveKit `EncodedFileType.MP4 = 1`), Supabase S3-compatible storage, 640×360 at 24fps, 500kbps video and 64kbps audio.
- The Egress webhook is mounted before the JSON parser, reads the raw body, verifies the signed JWT issuer/signature and SHA-256 body digest, accepts only `egress_ended`, and validates completion status, exact output path, file size and duration before marking a replay ready.
- Ready playback is delivered only through an authenticated six-minute signed URL. The replay bucket is not public. Creator deletion and seven-day retention cleanup remove private objects.
- A worker recovers active Egress starts, stops expired recordings, retries stop failures and removes expired objects. A failed/missing Egress start releases its quota reservation.
- Backend tests cover Egress request construction, MP4 output, signed webhook validation, nanosecond duration parsing, read-only Egress/S3 credential validation, route authorization contracts, quota migration and worker mounting.

### Fresh production catalog/storage snapshot

- `public.live_stream_replays`: RLS enabled; no policies; no anon or authenticated SELECT/INSERT/UPDATE/DELETE privileges; service-role access only.
- `reserve_live_replay_quota`, `finalize_live_replay_quota`, and `get_live_replay_storage_bytes`: SECURITY DEFINER with empty pinned search_path; EXECUTE roles are postgres and service_role only.
- `live-replays` bucket: private, 48,000,000-byte file cap, MIME allowlist `video/mp4`.
- Current replay rows: 0. Current objects in the bucket: 0 (0 bytes). Quota row: 0 reserved seconds, 2 used seconds, no active replay ID.
- No production database changes were made during this review.

### Constraints and open risks

- Current product limits are five minutes per replay, 50 minutes of aggregate replay allowance per calendar month, one globally active replay reservation at a time, 48 MB per MP4, and seven-day retention. This is a deliberately constrained free-tier design, not unlimited creator replay.
- The production Render workspace environment flags and actual Egress/webhook runtime logs were not re-verified in this pass. The server requires both `LIVEKIT_REPLAY_ENABLED=true` and `LIVEKIT_REPLAY_BUILD_PLAN_CONFIRMED=true`; missing either keeps replay disabled.
- The recovery worker's Egress lookup currently requests active Egress only. If an ambiguous Egress start completed but its signed webhook was never delivered and its Egress ID was never persisted, the worker can fail the row after its recovery grace period rather than reconstructing a completed output. LiveKit retries webhooks, but delivery is not guaranteed. This is a P2 recovery-hardening item.
- No real creator-to-viewer recording, webhook receipt, Supabase object upload, signed playback, expiry, or cleanup cycle has been accepted on production. Zero rows/objects means there is currently no production replay to play. The previous “LIVE replays unavailable” symptom therefore remains unresolved at runtime even though source implementation exists.

Official protocol references reviewed: https://docs.livekit.io/reference/other/egress/api/ and https://docs.livekit.io/intro/basics/rooms-participants-tracks/webhooks-events/
