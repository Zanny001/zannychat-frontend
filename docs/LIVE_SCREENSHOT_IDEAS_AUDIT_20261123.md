# ZannyChat LIVE — screenshot ideas audit and delivery register

**Source:** `Ideas needed to be implemented on zannychat.pdf` (five screenshot pages)  
**Audit date:** 2026-11-23  
**Scope:** Extend the existing LIVE implementation; preserve current Crown Aurora direction, server-authoritative permissions, and the existing broadcast/video-chat/audio-room experiences.

## 1. Source requirements extracted from the five pages

| Page | Visible idea | Required product behaviour |
|---|---|---|
| 1 | Broadcaster invite and guest invitation card | Creator invites a viewer; recipient explicitly accepts or rejects; no publishing before consent |
| 2 | PK battle result overlay | Two creators compete in a time-bounded LIVE battle; show authoritative outcome and a clear acknowledgement action |
| 3 | Large host video with guest stage | Responsive host/guest video stage, participant identity, comments, quick reactions, and guest admission |
| 4 | Multi-person room with numbered seats and audio/video join choices | Seat occupancy, open seats, participant roles, guest admission, and an explicit Video Join / Audio Join choice |
| 5 | Creator profile and room tools | Creator identity/follow context and accessible room actions: Connect, Share, Recorder, Minimize, Quality, Watching Optimization, Gift Settings, Report, Block, Not Interested, Translation, Clean Mode |

The screenshots are visual references. They do not specify PK scoring rules, gift prices, recording retention, translation providers, or a final maximum seat count.

## 2. Existing implementation found in GitHub

- Native and web LIVE rooms already use LiveKit and have separate implementations in `src/screens/LiveStreamScreen.js` and `src/screens/LiveStreamScreen.web.js`.
- Creator invitations, guest requests, a five-guest cap, guest queues, creator-authorized participant moderation, microphone mute, spotlight, guest removal, reports, and replay controls already have implementation foundations.
- The backend uses authenticated LIVE routes in `src/routes/liveStreams.js`.
- The production `live_stream_invites` status constraint already supports `pending`, `accepted`, and `declined`; the atomic join function only grants the guest role when a guest invitation is accepted.
- Native and web media rooms already enable LiveKit adaptive stream / dynacast options. These provide automatic media adaptation, not a user-facing quality selector.
- Existing replay recording is the server-side recording path. Its availability depends on backend LiveKit Egress and storage configuration.

## 3. Implementation started in the current delivery branch

| Capability | Change in progress | Verification gate |
|---|---|---|
| Direct guest invitation consent | New invitations are pending; recipient-only accept/decline endpoint; creator decision notification | Backend and frontend CI; verify invitation, decline, expiry, block, and retry paths |
| Video Join / Audio Join | Guest join accepts an explicit media mode; audio-only token is microphone-only; camera controls are hidden for audio-only guests | Native/web CI; test camera permission denied, audio route, and no camera publication |
| Share LIVE | Native and web room tools share a URL containing the actual stream ID | Verify Android/iOS share sheets, browser share behaviour, and authenticated return-to-stream |
| Clean Mode | Existing hide-chat behaviour is explicitly exposed as Clean Mode | Verify comments/reactions are hidden and restored without changing server state |
| Not Interested | Viewer action and private creator-level suppression preference are being added | Backend migration, endpoint, discovery filtering, and native/web action require CI and preview validation |

Related PRs:
- Frontend: https://github.com/Zanny001/zannychat-frontend/pull/372
- Backend (guest consent and media mode): https://github.com/Zanny001/zannychat-backend/pull/192
- Backend (Not Interested persistence and discovery filter): https://github.com/Zanny001/zannychat-backend/pull/193

The backend PR passed its Backend quality and Advanced calling backend checks on the current revision. The frontend PR's exact-head checks and Vercel preview remain release gates. Neither PR is merged or deployed.

## 4. Remaining gaps and implementation requirements

### 4.1 PK battle — new feature, not found in current implementation

Required work:
- Creator-to-creator challenge, recipient acceptance/decline, and server-authoritative battle lifecycle.
- Both creators must be in the same authorized battle context; block and safety restrictions must be rechecked.
- Defined start/end time, reconnect grace, early termination, creator departure, and duplicate-event handling.
- A server-authoritative score ledger and deterministic winner/tie result.
- A result card matching the supplied win/loss reference, with accessible acknowledgement and replay/history linkage.
- Abuse controls, rate limits, idempotency, audit history, and tests for simultaneous actions and stale updates.

**Scoring is deliberately not invented.** The PDF shows a win/loss result but does not define whether points come from reactions, gifts, audience votes, or another source. Do not attach monetary value or wallet balances to battle scoring without an approved rule.

### 4.2 Room tools — current coverage

| Tool in source | Current evidence | Remaining work |
|---|---|---|
| Connect | Native system audio-route picker and browser audio-output picker are available from LIVE room tools | Verify Bluetooth/headset switching and browser support; clarify whether the screenshot intended a different connection action |
| Share | Added to the current native/web implementation branch | Validate share-sheet behaviour and the destination deep link |
| Recorder | Existing replay start/stop flow | Verify server configuration, recording permissions, processing/recovery, and retention |
| Minimize | No in-room minimize / PiP action found | Design platform-specific PiP/background behaviour; do not claim support until verified |
| Quality | Native/web Auto/Low/Medium/High quality caps are being added through LiveKit remote publication controls | Verify simulcast support, quality changes on newly joined tracks, and adaptive-stream interaction |
| Watching Optimization | Adaptive stream and dynacast are already enabled by default | Verify constrained-bandwidth behaviour; avoid a cosmetic toggle because the current room options are enabled at connection time |
| Gift Settings | No corresponding in-room settings flow found | Audit gift catalogue, wallet/ledger, pricing, moderation, and purchase safeguards before adding |
| Report | Existing LIVE reporting and moderation routes | Verify viewer and moderator journeys end to end |
| Block | Native/web Block Creator action uses the existing account-level block API and exits the active LIVE session | Verify blocked creator cannot be rediscovered, rejoined, or surfaced through another LIVE entry point |
| Not Interested | New server-managed creator suppression preference and discovery filter are in PR #193; native/web room action is in PR #372 | Verify persistence, privacy, and discovery behaviour on two accounts |
| Translation | No LIVE translation control or transcript pipeline found | Define captions/transcription, supported languages, consent, privacy, latency, and cost |
| Clean Mode | Existing hide-chat toggle, now named Clean Mode in the current branch | Verify all overlays, reactions, and accessibility labels behave consistently |

### 4.3 Stage capacity discrepancy

Page 4 appears to depict a host plus numbered participant seats up to 8. The current backend intentionally enforces a maximum of **five guest publishers** (host plus up to five guests). The screenshots do not explicitly state whether all numbered seats are meant to be simultaneously publishable.

Keep the current server-side five-guest cap until the intended seat count is confirmed. A visual seat grid must never imply that a user can publish when the backend will reject them.

## 5. End-to-end acceptance checklist

- Invitation lifecycle: pending → accepted or declined; only the recipient can decide; duplicate/stale decisions are rejected.
- Admission: guest token is issued only after acceptance; audio-only tokens cannot publish camera; no microphone/camera activation before consent.
- Stage: seat occupancy is server-derived; cap is enforced atomically; reconnect and participant departure do not create ghost seats.
- Media: Android, iOS, and web host/guest tracks; camera/microphone permissions; audio route; low-bandwidth recovery; background/foreground.
- Room tools: every visible action performs a real supported action or clearly explains why it is unavailable.
- Safety: report, block, moderation, and not-interested behaviour is authorized, auditable, and respects bidirectional block privacy.
- Replay: recording availability, Egress, private storage, processing, playback URL lifetime, retention, and failure recovery are verified.
- Quality: adaptive-stream behaviour is measured under constrained bandwidth; no cosmetic selector without a real effect.
- PK: challenge concurrency, score integrity, tie handling, disconnects, and outcome persistence are tested.
- Accessibility: semantic labels, focus order, 48-point touch targets, safe areas, reduced motion, and readable contrast.
- Release: frontend/backend CI, exact-head preview, production smoke tests, monitoring, rollback readiness, and no unresolved critical/high security findings.

## 6. Release discipline

- Do not merge frontend invitation UI before the companion backend decision API is available.
- Do not apply production migrations for this consent slice; it reuses existing invitation statuses.
- Do not bypass Vercel deployment quota or claim a preview is verified until the exact PR head has a successful deployment.
- Do not raise the guest cap, create a gift economy, or invent PK scoring from visual screenshots alone.


## 7. Previously reported production regressions to re-test

These are historical reports, not claims that the defects still exist on the current production build. Reproduce them against the current deployed revision and attach logs, device/browser details, and exact request/response evidence before assigning a current status:

- LIVE reaction submission failure (reported message: `Could not send LIVE reaction`).
- LIVE replay availability/playback failure (reported message: `LIVE replays unavailable`).
- Call-history screen crash when opening a history entry.
- Google sign-in completing without granting access to the main chat.
- OAuth callback returning to a blank production screen.
- Call/video audio reliability issues, including participants unable to hear one another and switching audio/video during an active call.

For each reproduction, trace the full user journey through UI event, client state, network request, backend authorization, database/LiveKit state, and rendered result. Fix the originating layer, add a regression test, then verify the complete journey before release.


## 8. Production database and source checks — 2026-11-23

Read-only checks against the configured Supabase project confirmed:

- `live_stream_invites` already accepts `pending`, `requested`, `accepted`, `declined`, and `revoked`; the guest-consent implementation does not need a schema migration.
- `public.record_live_creator_impact(uuid, uuid, text)` exists as a SECURITY DEFINER function with an empty search path. Its implementation checks active stream state and joined participant status before recording a reaction. The production tables contain 84 reaction rows (58 in the last 24 hours, 83 in the last 7 days) and 3 creator-impact rows, so the path has succeeded for some requests; the reported failure may be intermittent or participant-specific.
- The private `live-replays` storage bucket exists, but it currently contains **0 objects**; `live_stream_replays` currently contains **0 rows**. This confirms no replay artefacts are present, but does not establish whether Render's Egress/storage environment is currently enabled.
- `public.live_stream_feedback` does not exist in production and migration `20261123090000` is not recorded as applied. This is expected until PR #193 is reviewed and the migration is separately approved/applied.

The previously reported LIVE reaction failure is not yet root-caused: the backend maps unexpected impact RPC/service errors to the generic `Could not send LIVE reaction` response. Current Render application logs are needed to identify the exact error code. The Render connector currently requires the user to confirm the workspace before log inspection.

The reaction route also has an 8-per-10-second server limit, validates the seven supported reaction keys, verifies active stream membership, and calls the impact RPC. The native client throttles to at most one request per 1.3 seconds (about 7.7 per 10 seconds), below the server limit under normal single-client use. The route returns the generic 503 only for unexpected RPC/service failures; this makes the Render error log essential for root-cause analysis rather than changing the throttle speculatively.

## 6. Follow-up defects found during the production/source audit (2026-11-23)

Two integration gaps were found after the initial implementation and corrected in the companion backend branches:

- **Pending guest invitation inbox:** the existing `GET /live/invitations` route selected pending and accepted rows but only returned pending viewer invitations and accepted guest invitations. A pending guest invitation therefore could not be surfaced through that inbox. The consent branch now returns pending guest invitations as well, with a regression contract.
- **Public Not Interested filtering:** the first feedback branch filtered followed LIVE streams but did not apply the preference to the main public `GET /live/` discovery feed. The branch now applies block and Not Interested filters to both feeds, fetches a larger candidate set before filtering, and caps the returned list at 50. A regression contract covers both routes.

These fixes are committed to the same companion backend PRs; they are not yet production changes.

## 7. Production replay evidence — investigation still open

Read-only production checks on 2026-11-23 found:

- Render reports replay credentials configured and Egress API authentication successful.
- The backend logs contain two successful replay-start responses (HTTP 201) in the available seven-day window and multiple Egress webhook requests returning HTTP 200.
- Supabase currently reports zero rows in `live_stream_replays`, while `live_replay_quota` shows 101 seconds used and zero reserved seconds.
- The replay cleanup worker intentionally deletes ready/failed/processing/deleted replay rows after their `expires_at` timestamp. The current empty table alone therefore does not prove that Egress never worked.
- The exact relationship between those historical starts, webhook finalization outcomes, storage objects, and row expiry is not yet established. Do not label replay production-ready until a fresh recording is created, finalized, retained, and played from a second account/device.

A single production client diagnostic reported `ReferenceError`; the telemetry available in Render does not include enough detail to attribute that error to replay playback. Treat it as an unclassified client runtime error, not a confirmed replay root cause.

## 8. Release gates updated

- Backend PR #192 must pass exact-head CI after the pending-invitation inbox correction.
- Backend PR #193 passed Backend quality and Advanced calling checks after public-feed filtering was added.
- Frontend PR #372 has successful Advanced calling and LIVE quality workflows; its Vercel check is blocked by a build-rate limit, while the Netlify deploy preview succeeded.
- No production database migration or deployment has been performed for these changes.

## 9. Browser LIVE minimization (2026-11-23)

- Added a browser Picture-in-Picture action to the web LIVE room menu.
- The action uses the attached LIVE video element, feature-detects PiP support, checks video readiness, and handles user cancellation/permission errors without disconnecting the room.
- Added a web contract test for supported and unsupported browser paths.
- Native Android/iOS background PiP is not claimed as implemented; it requires platform-specific native capability/configuration and real-device verification.

## 10. PK Battle scoring dependency

A read-only production schema inspection found no public gift catalogue, wallet, or gift-transaction tables among the current LIVE/wallet-related tables. Therefore a gift-funded PK score cannot safely be implemented by inventing a client-side score or writing into unrelated financial tables. The PK feature remains gated on identifying the actual gift/ledger service or defining a dedicated server-authoritative battle score source. The score must be idempotent, auditable, resistant to duplicate/replayed events, and must never mutate wallet balances as a side effect of score updates.
