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
| Connect | Existing LIVE room connection and audio-output controls | Clarify whether this means audio route, creator follow, or a separate connection action |
| Share | Added to the current native/web implementation branch | Validate share-sheet behaviour and the destination deep link |
| Recorder | Existing replay start/stop flow | Verify server configuration, recording permissions, processing/recovery, and retention |
| Minimize | No in-room minimize / PiP action found | Design platform-specific PiP/background behaviour; do not claim support until verified |
| Quality | Adaptive streaming is enabled by default | Decide whether manual Auto/Low/Medium/High controls are required and map them to supported LiveKit APIs |
| Watching Optimization | Adaptive stream and dynacast are already enabled | Add explanatory state or preferences only if they change actual subscription behaviour |
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
