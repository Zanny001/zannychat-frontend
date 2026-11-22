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


## 9. Execution update — 2026-11-22 (P0 reliability)

- **Voice notes:** PR #295 is merged as `f8d36066b9d52a028cfc3f65531cbb7c256f13e1`. Production Vercel deployment was rechecked and is READY on main commit `66e4b9d086fa7fafae99fb446d8fc0671521c273`; the production alias resolves to `https://zannychat.vercel.app`. Physical-device playback/speed/seek acceptance remains pending.
- **Browser group-call remote audio:** PR #297 is open on current main; all frontend, dependency, Android Kotlin compile, iOS prebuild, web/Android export, call-recovery, native receiver, release/integrity and bundle-exposure checks passed. Its Vercel preview is READY at `https://zannychat-7nmsv3j1o-zanny-chat.vercel.app`. Keep it out of production until a two-participant browser/device test confirms two-way audio and autoplay-unlock recovery.
- **LIVE teardown polling:** PR #298 adds ended-state guards to native/web comments, guest-status and guest-request pollers, ignores in-flight responses after teardown, and prevents queued comment refreshes restarting after end. Motivation is observed guest-request 404 traffic during teardown. Fresh frontend/client/bundle CI is running; Vercel preview is QUEUED. No merge/deployment acceptance yet.
- **Current release baseline:** production main deployment for commit `66e4b9d` is READY. Do not mistake PR previews for production.
- **Manual P0 gates still required:** (1) two participants test browser call audio on PR #297 preview; (2) a creator/viewer LIVE session confirms reactions, guest approval, and that guest-request polling stops after ending/leaving; (3) test voice-note playback, speed and seek on production Android. Automated CI and READY deployments are not substitutes for these device checks.


## 10. Execution update — 2026-11-22 07:12 UTC

- **LIVE teardown polling:** PR #298 was superseded and closed. Its current-main replacement, PR #300, passed frontend-quality and advanced-calling client CI and merged as `748c1a3d097437ae0d7a9743797d7ca9194548c2`. The Vercel preview `https://zannychat-j3zx29g40-zanny-chat.vercel.app` was READY. The production deployment for this exact main SHA was still BUILDING at the checkpoint; verify before calling it deployed.
- **Browser remote audio:** PR #297 was superseded because its base diverged. PR #301 reapplies the two-file change on current main at `f65870d432791ae0b945f466e02e4b9ecce6e0ec`; fresh CI and Vercel preview are pending. Keep the two-participant browser/device audio and autoplay-unlock test as a hard P0 gate.
- **Manual acceptance:** production Android voice-note playback/speed/seek; LIVE creator/viewer/guest lifecycle after #300 deployment; two-way browser call audio on #301 preview. Do not equate green CI or a READY preview with user/device acceptance.


## 11. Browser audio acceptance — 2026-11-22 07:19 UTC

- User tested a real two-participant audio call and confirmed clear two-way audio.
- PR #301 merged as `b4b9eee9eecc98e511d4b939376ce778f782465d`; advanced-calling client and premium/LIVE quality workflows passed on the PR head, as did dependency and bundle-exposure audits. Vercel preview was READY.
- Production deployment for the merge SHA was still BUILDING at the checkpoint; verify before claiming production rollout.
- Keep a distinct acceptance check for forced autoplay denial followed by the audio-unlock gesture. The user's successful call confirms normal two-way audio, not necessarily this edge case.
- Still pending: Android voice-note playback/speed/seek acceptance and LIVE creator/viewer/guest lifecycle acceptance.


## 12. Product-wide Crown Aurora quality charter — 2026-11-22

This section supersedes older checkpoint statements above wherever they conflict with the current GitHub, CI and deployment evidence.

### The next major programme: Crown Experience Transformation

ZannyChat's next major product programme is a coordinated, product-wide transformation of its visual and interaction experience. This is not a request to add decorative effects to isolated screens. The objective is a coherent, recognisable, premium communication product in which every surface feels intentionally designed.

**Permanent product rule:** every new feature, bug fix that changes a screen, and existing-screen redesign must meet the Crown Aurora quality bar. Visual quality is a release requirement alongside correctness, accessibility, privacy and performance—not a later polish phase.

### Experience principles

1. **Signature identity:** Crown Aurora uses a deep, composed foundation with purposeful violet/cyan expression and restrained crown-gold accents. Colour must communicate hierarchy and state, not overwhelm content.
2. **Editorial hierarchy:** confident typography, clear spacing, balanced density, legible metadata and predictable alignment. Avoid oversized containers, cramped controls, noisy gradients and excessive card nesting.
3. **Crafted surfaces:** consistent radii, borders, elevation, translucency and depth. Glass and glow are accents, not substitutes for contrast or structure.
4. **Motion with purpose:** short, fluid transitions and feedback that clarify navigation and state. Respect reduced-motion preferences and keep older Android devices smooth.
5. **Touch-first precision:** generous hit targets, stable layouts, no overlapping controls, safe-area awareness and comfortable one-handed use.
6. **Complete states:** every screen must intentionally design loading, empty, populated, offline, error, disabled, pressed, selected, permission-denied and destructive-confirmation states where relevant.
7. **Personal expression:** user-selected accents and appearance options must remain tasteful, accessible, persistent and consistent across screens.
8. **Content leads:** messages, media, people and creator content remain the focus. Avoid UI chrome that competes with the conversation.
9. **Accessible by default:** sufficient contrast, scalable text, screen-reader labels, keyboard support on web, focus visibility and reduced motion.
10. **Performance is part of luxury:** bounded media, responsive transitions, no avoidable layout shifts, no unnecessary animation, and graceful behaviour on low/mid-range Android devices.

### Scope — no screen left behind

The transformation covers the complete registered application, not just Chats:
- Main navigation and every primary destination.
- Chats list, chat thread, composer, message actions, drafts, saved/pinned messages, folders and shared media.
- New chat, contacts, search, discovery and channel experiences.
- Profiles, identity cards, settings, privacy, account and personalisation.
- Calls, incoming/outgoing call states, in-call controls and call history.
- LIVE discovery, creator dashboard, preflight, viewer, guest, moderation and replay surfaces.
- Updates/stories, groups, communities, notifications and supporting flows.

The canonical screen inventory must be reconciled before declaring coverage complete. Every screen receives an explicit audit status; shared components do not count as proof that every screen has been reviewed.

### Delivery method — broad vision, controlled engineering

Work should be organised as coherent experience domains and vertical slices, not scattered micro-polish tickets. Each domain should include its complete screen family, shared components, interaction states, responsive behaviour, accessibility, tests and evidence. Cross-domain foundations should be reused rather than reimplemented.

Recommended order:
1. **Design foundation and inventory:** reconcile screen/module counts, map current navigation and identify shared primitives, theme tokens, typography, spacing and interaction patterns.
2. **Core communication experience:** Chats, Chat, composer, message bubbles, media, search and contact discovery.
3. **Identity and personalisation:** profiles, settings, appearance, privacy and account surfaces.
4. **Real-time experience:** Calls and LIVE, including their complete pre-join, active, reconnecting, ended and failure states.
5. **Social and discovery:** Updates, Channels/Explore, groups and community surfaces.
6. **System-wide finish:** transitions, haptics, accessibility, responsive web, low-end Android performance and visual regression coverage.

Reliability P0 work continues in parallel where safe. Do not delay urgent production fixes for visual work, and do not use visual work to conceal unresolved functional defects.

### Mandatory acceptance scorecard

A screen or feature is not complete until it passes all applicable checks:
- Visual coherence with Crown Aurora and neighbouring screens.
- Correct hierarchy, spacing, density, typography and moderate view/container sizing.
- Responsive behaviour at narrow Android sizes and web breakpoints.
- No overlap, clipping, jitter, unintended scroll traps or broken safe areas.
- All primary and secondary controls perform their real actions.
- Loading, empty, error, offline, disabled and success states are designed.
- Accessibility, contrast, touch targets and reduced-motion behaviour pass.
- Existing navigation, data contracts, permissions and user preferences remain intact.
- Tests cover important interactions and regressions.
- Real-device review is recorded for high-traffic or media-heavy screens.

A screen may be labelled **implemented**, **automated-tested**, **deployed**, or **device-accepted** only when that exact status is supported by evidence. A preview or green CI run is not visual/device acceptance.

### Current P0 release checkpoint

- Main commit: `eabe8be04d9e1d26c1b54cf939d72e4f3d60a4b2`.
- Advanced calling client CI on that commit completed successfully: dependency audit, client quality and bundle exposure audit all passed.
- Vercel production deployment for that exact commit is READY and aliases include `https://zannychat.vercel.app`.
- Two-participant audio call: user confirmed clear two-way audio; browser remote-audio recovery PR #301 is merged.
- Still awaiting real-device acceptance: Android voice-note play/pause, speed, seek and duration; LIVE creator/viewer/guest lifecycle and post-end polling behaviour; the distinct forced-autoplay-denial/audio-unlock edge case.
- These remaining checks must stay visible; production readiness does not imply every P0 device gate is accepted.

### Cost and product discipline

Maintain the ₦0/free-tier constraint unless the user explicitly approves a disclosed cost. Premium perception must come from design craft, performance and useful capability—not paid dependencies, fake counters, simulated transactions, or decorative features with no user value.
