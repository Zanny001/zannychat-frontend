# ZannyChat LIVE premium experience audit — 2026-11-16

## Scope and evidence standard

This audit reviews the current frontend LIVE hub, creator profile, native/web LIVE rooms and the authenticated backend LIVE routes. Existing code is evidence of implementation only; it is not proof of production operation. The separate reliability PR #86 addresses media lifecycle defects and must pass real two-account browser and two-device native acceptance before release.

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
| P1 | LIVE discovery has only All / Following / Public filters and no search input. | Viewers cannot quickly find a broadcast by topic or creator; discovery is limited to a small server result set. | Add client search now; later add server-backed pagination, categories and ranked discovery only with an agreed schema and query contract. |
| P1 | Hub is a single long feed with a large broadcast composer before discovery. | The primary viewer task—finding and joining a LIVE—is visually secondary to creator setup. | Reorder the experience into a compact discovery header, featured/following rail, live cards, then a collapsible/secondary creator entry point. Preserve all current flows. |
| P1 | Creator profile summary shows basic totals and recent broadcasts/replays but not audience analytics. | Creators cannot evaluate reach, retention or broadcast quality. | Add measured analytics only after defining event collection and privacy/retention rules; do not invent watch-time or retention values from participant rows. |
| P1 | Stage controls are exposed as a dense cluster of small top-bar actions. | Creator, guest and viewer responsibilities are hard to distinguish on smaller devices. | Group creator tools into Studio controls; keep viewer actions separate; show role-specific labels, guest queue, connection state and clear confirmation for destructive actions. |
| P1 | Guest stage and audience are represented primarily as video tiles and generic participant actions. | Guests can confuse creator controls with their own controls; role transitions are not sufficiently legible. | Persistent role labels, creator-only Studio drawer, guest self-controls, request queue states, stage-capacity indicator and clear demotion state. |
| P2 | No source-backed category, scheduled event, PK, poll, gift or fan-club workflow is present in the inspected screens/routes. | These are meaningful engagement features, but must not be represented as working before service and safety design exist. | Plan categories/events first; defer PK, gifts, wallet, cash-out and fan-club economy until backend ledger, purchase verification, abuse controls and reconciliation are designed. |
| P1 | Replay UI can display pending/failure states, but production audit found no replay records or stored objects at audit time. | A replay control does not prove the recording pipeline works. | Keep recording-to-webhook-to-storage-to-signed-playback acceptance as a release gate; show retryable failure states and avoid presenting unavailable rows as playable. |

## Current implementation started in this branch

- Added local LIVE search across stream title, description and creator display-name fields.
- Paired backend PR #109 adds `creator_name` to public and followed discovery results after existing visibility/block filtering; the frontend PR depends on that API change for creator-name search.
- Search composes with existing All / Following / Public filters and does not alter backend permissions or widen visibility.
- Collapsed the broadcast setup composer by default so discovery is the primary hub task; creators can expand the existing setup without losing any controls.
- Creator profile replay rows now open only when status is `ready`; starting/recording/processing/failed states are labelled and non-navigable, preventing viewers from opening an unavailable replay.
- Added automated tests for case-insensitive search, creator names, combined filters and empty/malformed input.

## Design direction

Use Crown Aurora: deep void navy, restrained violet/cyan accents and crown-gold only for premium emphasis. Keep video containers moderate and legible, use calm glass surfaces, strong creator/guest/viewer role hierarchy, accessible hit targets and reduced-motion support. Do not sacrifice text contrast or stage area for decorative effects.

## Release and safety gates

1. PR #86 reliability changes remain separate and unmerged until all CI and real-media acceptance gates pass.
2. Search is client-side over the server response; it does not imply complete global search or pagination.
3. No schema migration, RLS change, wallet balance, virtual gift purchase or cash-out is included in this premium pass.
4. Verify web and native layouts, screen readers, empty states, large text, dark/light themes and narrow screens before merging.
