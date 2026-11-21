# ZannyChat Crown Experience — Premium Feature Roadmap

**Created:** 2026-11-21  
**Status:** Proposed product direction; implementation must be delivered as independently reviewable vertical slices  
**Governance:** [Master Blueprint](./ZANNYCHAT_MASTER_BLUEPRINT.md) · [Delivery Register](./ZANNYCHAT_DELIVERY_REGISTER.md) · [Master Execution Phases](./MASTER_EXECUTION_PHASES_20261120.md)  
**Operating constraint:** Preserve the existing ₦0 / free-tier model. No paid API, hosting, storage, provider, or plan commitment without explicit cost disclosure and approval.

> This roadmap differentiates ZannyChat through craft, reliability and useful capabilities—not feature count. Existing working functionality, six primary destinations, user data, security boundaries and service contracts take precedence over novelty.

## 1. Product promise

**ZannyChat should feel like a beautifully crafted private communication world:** fast and calm for everyday conversations, expressive when people want personality, intelligent when users need help, and dependable when a conversation matters.

The product should earn premium perception through:
- A distinctive Crown Aurora identity with restrained depth, motion and personalisation.
- Frictionless, reliable communication across devices and network conditions.
- Helpful intelligence that is transparent, optional and privacy-respecting.
- Social and creator experiences with real community value and meaningful safety.
- Clear user control over privacy, data, notifications and account sessions.

## 2. Execution rules

1. Stabilise current LIVE/calling incidents and close the production-acceptance gaps before expanding into dependent experiences.
2. Deliver one vertical slice at a time: UX, frontend state, service/API, persistence, authorization/RLS, abuse controls, tests, observability, documentation and runtime acceptance.
3. Reconcile current main and open PRs before coding. Do not duplicate existing work or revive closed branches wholesale.
4. Keep all six primary destinations: Chats, Calls, LIVE, Updates, Channels/Explore and Profile.
5. Every control must perform a real action or be clearly labelled unavailable. No mock viewers, fabricated AI output, placeholder balances, fake delivery states or decorative controls.
6. AI and transcription features must be opt-in, disclose processing and data retention, and have a useful non-AI fallback. No user message or media may be sent to a third-party model without an explicit product/privacy decision.
7. Preserve server-side authorization, least privilege, rate limits, idempotency, signed media access and auditability.
8. Use existing infrastructure/free tiers where practical. If a feature requires a paid provider or exceeds free-tier limits, document the cost and defer pending approval.
9. “Implemented”, “merged”, “deployed” and “accepted” remain separate statuses. Acceptance requires real-device/two-account evidence where applicable.

## 3. Priority sequence

### P0 — Reliability before expansion

**Goal:** Make existing communication trustworthy.

- Complete the browser LiveKit remote-audio playback recovery work in PR #293, including a real two-participant browser test and regression verification.
- Verify direct and group calls: two-way audio/video, mute/camera toggles, audio-to-video switching, participant add/remove, reconnect, background/foreground, hangup and resource cleanup.
- Verify LIVE creator/viewer/guest roles, moderation, comments/reactions, replay playback and leave-versus-end semantics with separate accounts.
- Resolve remaining critical runtime crashes and capture useful, redacted diagnostics without collecting message content or credentials.
- Record current frontend/backend production SHAs, deployment IDs and smoke-test outcomes.

**Exit gate:** No known critical call/LIVE blocker; two-account and device/browser acceptance evidence recorded. A green CI build alone does not pass this gate.

### P1 — Crown Aurora Signature Experience

**Goal:** Make every existing screen feel like one premium product.

- Finish the shared semantic design system: typography, spacing, radii, elevation, focus, pressed/disabled/loading/error states and motion.
- Deliver refined message bubbles, compact information hierarchy, elegant media previews, responsive sheets, polished empty states and consistent navigation transitions.
- Add personalisation: saved accent palettes, chat-specific wallpaper/appearance, per-chat notification style and accessibility presets, all persisted and synced where appropriate.
- Add subtle haptics and motion with reduced-motion and older-Android fallbacks.
- Build a consistent profile/identity presentation, contact cards and QR sharing.
- Complete the registered screen audit sequentially; do not skip screens or treat a shared component as proof that each screen is accepted.

**Exit gate:** Screen-by-screen visual, responsive, accessibility and interaction evidence across supported Android devices and web; no regressions to existing theme preferences or navigation.

### P2 — Intelligent Everyday Messaging

**Goal:** Save time without making the app intrusive.

Candidate capabilities, sequenced by usefulness and privacy feasibility:
1. Voice-note playback improvements: speed control, waveform, seek, queue and clear recording/upload states.
2. On-device or user-approved voice-note transcription, with editable transcript and original audio preserved.
3. Message translation initiated by the user, with original text always available.
4. Smart message actions: copy, quote, save, pin, forward, remind me and add to a task/calendar only after explicit confirmation.
5. Powerful search: filters for person, date, media type, links, files and saved messages; fast pagination and permission-aware results.
6. Optional smart summaries for long threads, with clear source messages and no automatic sharing.
7. Better drafts and scheduled messages with timezone clarity, edit/cancel controls and reliable delivery status.

**Exit gate:** Real service-backed flows, privacy disclosures, two-account tests, offline/retry behaviour, accessibility and no fabricated output. AI-dependent items remain deferred if no acceptable free/private implementation exists.

### P3 — Best-in-Class Calling

**Goal:** Calls should feel effortless and resilient.

- Seamless audio/video switching without leaving the call.
- Invite/add participants and clear group-call role controls.
- Picture-in-picture/background continuity where platform support permits.
- Device selection and audio-route controls where supported.
- Network-quality indicator with understandable, non-alarming guidance.
- Adaptive media quality and graceful audio-only fallback on weak connections.
- Noise suppression/echo cancellation using supported native/browser capabilities, not unsupported promises.
- Call history with missed/declined/failed distinctions and user-controlled privacy.

**Exit gate:** Real Android device matrix, browser matrix, two or more participants, network transition tests, permission-denial tests and lifecycle/resource-leak checks.

### P4 — Social Expression and Communities

**Goal:** Give people richer ways to share and organise around interests.

- Stories/status: audience lists, close friends, viewers, reactions, replies, mute, report and reliable expiry.
- Groups: role templates, join requests, expiring invites, admin activity log, pinned resources and slow mode.
- Channels: discovery, creator identity, protected posts, comments/discussion, reactions and moderation.
- Polls and events: RSVP, reminders, timezone-safe scheduling, attendance visibility and abuse controls.
- Personal collections: saved posts, links, media and conversation folders.

**Exit gate:** Privacy and membership enforcement verified across accounts; expiry/cleanup jobs, moderation and notification preferences tested.

### P5 — ZannyChat LIVE Creator Ecosystem

**Goal:** Turn LIVE into a safe, reliable creator and community product.

- Finish the existing 18-experience / 32-capability audit and close its real acceptance gaps.
- Improve discovery with transparent ranking signals and user controls; do not fabricate viewer counts or engagement.
- Creator studio: preflight, schedule, moderation queue, guest controls, analytics and post-live insights.
- Guest rooms: dependable invite/approval/decline/expiry, five-guest enforcement, reconnect and clear host controls.
- Replay library/player: private playback, expiry, account isolation, deletion and storage-quota behaviour.
- Community safety: report/block, moderator permissions, evidence handling, rate limits and appeals.
- Future monetisation (gifts, wallet, battles, paid events) is **deferred** until legal/provider requirements, a real ledger, idempotency, fraud controls, refunds and audit trails are designed and approved. Never simulate balances or transactions.

**Exit gate:** Creator/viewer/guest two-account tests, replay authorization/expiry tests, real device media checks and safety review.

### P6 — Trust, Privacy and Account Control

**Goal:** Make user control a visible product strength.

- Security centre showing active sessions/devices and revoke-session action.
- Privacy dashboard for profile visibility, presence, read receipts, discovery and audience controls.
- Clear blocked/restricted contacts and reporting history.
- Account export and deletion journeys with progress, confirmation and retention disclosures.
- Login/session alerts and recovery guidance using existing secure infrastructure.
- Storage management for large media, downloads and cache with clear deletion consequences.
- Security review of RPCs, RLS, signed URLs, rate limits, enumeration resistance and diagnostics redaction.

**Exit gate:** Authorization and ownership tests, data export/deletion verification, session revocation tests and privacy UX acceptance.

### P7 — Performance and Delight

**Goal:** Make the product feel fast, composed and dependable.

- Faster cold start and route transitions; reduce unnecessary bundle and render work.
- Virtualise large timelines/lists and use bounded image/video loading.
- Background upload/download with resumable retry where supported.
- Low-data mode, media auto-download controls and network-aware quality.
- Reliable push notification preferences and deep-link routing.
- Battery, memory, crash and API-latency budgets with privacy-safe telemetry.
- Graceful offline mode and clear reconnect state.

**Exit gate:** Measured before/after performance on representative low/mid-range Android devices and slow networks; no regression in correctness or battery use.

## 4. Feature selection scorecard

Before accepting a new feature, score it against:
- User value and frequency of use.
- Differentiation that fits ZannyChat's identity.
- Reliability and cross-platform feasibility.
- Privacy/security risk and data minimisation.
- Accessibility and low-end device impact.
- Ongoing operating cost and free-tier compatibility.
- Backend complexity and maintenance burden.

Reject or defer features that are mainly decorative, duplicate a stronger existing flow, require unapproved recurring spend, or cannot be made secure and supportable.

## 5. First implementation candidates after P0

Once P0 is accepted, the recommended first feature slices are:

1. **Crown Aurora interaction polish** — shared components and the highest-traffic Chats/Chat/Calls/LIVE surfaces, followed by the remaining registered screens in sequence.
2. **Voice-note experience** — waveform, speed control, seeking and resilient upload/playback; this provides immediate value without requiring a paid AI provider.
3. **Search upgrade** — permission-aware filters and fast results across messages/media/links.
4. **Personalisation controls** — chat appearance, accent palettes and notification preferences with persistence.
5. **Calling quality and continuity** — only after the existing call path passes the P0 device gate.

These are proposals, not claims that the capabilities are already implemented.

## 6. Release definition

Every feature release must include:
- Product requirement and explicit non-goals.
- UX states and accessibility behaviour.
- Frontend implementation and domain/service contract.
- Backend validation, authorization and rate limiting where applicable.
- Database migration only when necessary, forward-only and reviewed.
- Automated unit/contract/integration tests.
- Real two-account/device acceptance where applicable.
- Observability and privacy-safe diagnostics.
- Documentation, rollback/disable strategy and exact commit/deployment evidence.

## 7. Current checkpoint (2026-11-21)

- Frontend production main was last verified in project handoff as commit `8ea621a`; local unit suite reported 1,159 passing and web export succeeded on that commit.
- PR #293, browser LiveKit remote-audio playback recovery, is open on branch `fix/web-livekit-remote-audio-playback` at `662923c`; automated workflows and Vercel preview were reported passing/READY, but real two-participant browser/device acceptance remains outstanding. Do not call it production-fixed until accepted and merged/deployed.
- This roadmap does not replace the canonical Delivery Register or the LIVE-first execution gates. Reconcile all statuses against current GitHub, deployments and runtime before starting each slice.


## 8. Execution update — 2026-11-22

- PR #294 (this roadmap) is merged into main; merge commit `0e6a358372b593a409e6f777de0b5262b2e53c60`.
- Voice-note playback controls (speed cycling 1×/1.25×/1.5×/2×, tap-to-seek, elapsed/total time and accessibility labels) were delivered in PR #295 and merged as `f8d36066b9d52a028cfc3f65531cbb7c256f13e1` after all recorded frontend quality, dependency, native Android compile, iOS prebuild, web/Android export, release/contract/integrity and bundle-exposure checks passed.
- The production Vercel deployment for `f8d3606` was observed in BUILDING state at the time of this update. It must be rechecked before marking deployed; physical-device playback/seek acceptance remains open.
- PR #293 (browser LiveKit remote-audio recovery) remains open. Its base is behind current main and GitHub currently reports it non-mergeable; it still requires branch synchronization, fresh CI and two-participant browser/device acceptance. Do not mark browser calling fixed based on source changes alone.
- Next feature work must continue only after reconciling these P0 acceptance gates and auditing existing main code to avoid duplicating already-merged capabilities.
