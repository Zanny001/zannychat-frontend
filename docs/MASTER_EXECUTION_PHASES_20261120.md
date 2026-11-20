# ZannyChat Master Execution Phases — 2026-11-20

**Status:** Proposed execution sequence; governed by the Master Blueprint and Delivery Register  
**Repositories:** `Zanny001/zannychat-frontend`, `Zanny001/zannychat-backend`  
**Budget constraint:** Preserve the ₦0 / existing-free-tier operating model  
**Authority:** This document sequences work; it does not override product scope, security rules, or acceptance criteria in the canonical blueprint/register.

> A phase is complete only when its source, tests, deployment and required runtime acceptance evidence are recorded. A green CI run, merged PR, route, mockup or READY deployment is not sufficient by itself.

## 1. Current checkpoint

- Frontend LIVE web-stage crash fix is merged to main in PR #212 (merge commit `1cc99815d1ef82e7b97fcc3d7987d3e095377377`). Its Vercel deployment was reported READY. Creator and viewer access to the existing Gas broadcast still require a real browser/two-account check; media delivery is not certified.
- Frontend LIVE leaderboard and settings work in PR #196 is merged (merge commit `6a58b158f9802ee11d58a783b3f440187436f28c`). Backend creator-preferences API PR #153 is merged (commit `88413b0e92fa5403016973f089cd49d583a7d1ee`), but its production migration is explicitly not applied. Do not use persisted creator defaults in production until the guarded migration has been separately reviewed, explicitly approved, applied, and smoke-tested.
- Backend LIVE reaction authorization/error mapping PR #167 is merged (commit `80099bf82e3ce59c8958cf82db3f38c837c340ae`).
- Frontend PR #85 is closed unmerged. Do not revive it wholesale. Reconcile its unique Crown Aurora, shared-component, push-preference and responsive-media changes against current main before selectively reapplying anything.
- The canonical register records 48 application experiences, an additional 18 LIVE experiences, and significant unaccepted runtime/device gates. These counts are different inventories, not interchangeable.
- Existing project issues still track two-account privacy/LIVE acceptance, physical-device media validation, backup/restore rehearsal, and dependency-advisory monitoring.

## 2. Execution principles

1. Work from fresh `main` in both repositories; inspect merged/open/closed PRs and current production state before every slice.
2. Deliver vertical slices: interface + domain/service + backend authorization + data/security + tests + documentation + operational evidence.
3. Preserve the six primary destinations: Chats, Calls, LIVE, Updates, Channels/Explore and Profile.
4. Use real authenticated data. No fabricated activity, fake viewers, placeholder transactions, decorative controls or mock success in production flows.
5. Prefer small, independently reviewable PRs. Run the relevant CI gates, inspect the diff and verify deployment status before calling a slice merged or shipped.
6. No production database mutation from this plan. Every proposed migration requires a forward-only SQL review, impact/rollback analysis, migration-ledger reconciliation and the user's explicit approval before execution.
7. Do not weaken RLS, grants, authorization, CORS, CSP, validation or rate limits to make a feature work.
8. Preserve free tiers and existing infrastructure. No paid egress, storage, hosting, provider, plan upgrade or external API commitment without a cost disclosure and explicit approval.
9. Treat physical-device, two-account, browser, restore and operational acceptance as separate evidence from automated tests.
10. Keep sensitive data, credentials, access tokens and production secrets out of commits, logs, issue comments and generated reports.

## 3. Phase sequence

### Phase 0 — LIVE incident stabilization and release truth

**Goal:** Restore reliable access to the current broadcast path without disrupting active user content.

- Verify the deployed frontend includes PR #212 and inspect production browser errors on creator and viewer paths.
- Re-enter the existing active broadcast as its creator and open it from All LIVE using a second account; do not create duplicates or end the current stream during diagnosis.
- Verify creator role recovery, viewer admission, camera/microphone publication, remote audio/video, comments, reactions, guest flow, reconnect, leave versus end semantics and safe room teardown.
- Confirm the visible END LIVE action is creator-only and confirmation-gated; viewers/guests must only leave.
- Reconcile LIVE replay recording separately: Egress completion, READY row, private MP4 object, authenticated signed playback, expiry, unauthorized denial and deletion.
- Update incident and delivery-register evidence with exact frontend/backend SHAs, deployment IDs and observed outcomes.

**Exit gate:** Creator and viewer can enter the same live room; media and core interactions work on real browsers/devices; no app-wide boundary crash; lifecycle semantics and replay outcomes are recorded. If a device or provider dependency blocks this, record it as blocked rather than accepted.

### Phase 1 — Architecture, data and security baseline

**Goal:** Establish a trustworthy map before broad implementation.

- Frontend: inventory all route declarations, screen modules, shared components, hooks, state stores, service clients and dependency directions. Identify duplicate ownership, oversized modules and screens bypassing domain services.
- Backend: map mounted routes to middleware, services, providers, scheduled workers, webhooks, data access and external dependencies.
- Supabase: map tables, views, RPCs, triggers, grants, RLS policies, Storage buckets/policies, publication membership and migration history. Distinguish service-role-only tables from client-accessible data.
- Contracts: document request/response/error conventions, pagination, idempotency, auth identity, rate-limit policy and realtime event ownership for each domain.
- Operations: inventory production environment variables by name only (never values), deployment workflows, health probes, worker schedules, logs, backup scope and rollback constraints.
- Security: compare current SECURITY DEFINER definitions and grants with prior reviews; inspect changed/new functions and delegated helpers. Review CORS and browser headers/CSP against actual required origins before proposing enforcement.

**Exit gate:** Versioned architecture/data/security maps, identified risks with severity and owner, no unresolved ambiguity about migration state, and a prioritized remediation backlog. This phase is read-only against production.

### Phase 2 — Crown Aurora design system and complete interface acceptance

**Goal:** Make the whole product visually coherent, responsive and accessible without breaking working flows.

- Reconcile the closed PR #85's unique changes with current main. Preserve the existing theme engine, Signal & Thread semantics, user-selected moods and Android 10/11 solid-surface fallback.
- Audit semantic color tokens, typography, spacing, radii, elevation, motion, focus, pressed/disabled/loading/error states and minimum touch targets.
- Audit shared Header, GlassCard, fields, buttons, list rows, sheets, dialogs, tabs, navigation, message bubbles, composer, media previews and overlays.
- Review the canonical 48 application experiences sequentially, one by one, including loading, populated, empty, error/retry, offline/reconnecting, permission-denied, stale/refreshing and success states where relevant.
- Complete the additional 18-experience LIVE checklist; a route or shared screen does not automatically satisfy an experience.
- Validate narrow/common/large phones, tablet and desktop layouts; keyboard avoidance; safe areas; screen readers; text scaling; high contrast; reduced motion; focus order and Android back behaviour.
- Keep containers moderate and content bounded; avoid overlap, clipped actions, excessive glow/blur and controls that only look interactive.

**Exit gate:** All 48 experiences and 18 LIVE experiences have dated evidence, no critical visual/accessibility regressions, and every visible control has a real action or is clearly disabled/not yet available.

### Phase 3 — Identity, account lifecycle and privacy

**Goal:** Prove account ownership and user control across the app.

- Verify onboarding, signup, login, email verification, resend/cooldown, recovery/reset, anti-enumeration and session invalidation.
- Verify profile/edit, avatar upload, QR/contact sharing and contact discovery with permission-denied and malformed-input paths.
- Verify session inventory/revocation, notification preferences, account export and account deletion/re-authentication.
- Run two-account isolation checks across profile, contacts, block/unblock, reports, status audiences, private media and realtime subscriptions.
- Verify bidirectional block enforcement in status visibility (tracked in backend issue #19) and retain owner-self visibility.
- Review push token registration, opt-out persistence, account switching, unregister and actual device delivery.

**Exit gate:** Identity and privacy tests pass for both account directions; no cross-account data or media access; device/session and deletion semantics are verified.

### Phase 4 — Core messaging reliability

**Goal:** Ensure messages are durable, correctly ordered, private and recoverable.

- Verify send, edit, delete, reply, forward, reactions, pin/unpin, save, drafts, folders, scheduled messages and receipts against real backend state.
- Verify text, image, video, audio, voice note and document upload/download, progress, retry, cancellation, signed URL expiry and cleanup.
- Verify inbox/message pagination, search, unread/read cursors, typing/presence and realtime subscription cleanup.
- Design and test offline outbox/reconnect reconciliation, idempotency, duplicate prevention, ordering and account-switch isolation.
- Preserve the existing composer and message semantics; media forwarding must use server-side copy/re-authorization, never reuse a source-conversation private URL.
- Close gaps with focused contracts/integration tests before refactoring large screen modules.

**Exit gate:** Two-account tests plus interrupted-network tests demonstrate no unauthorized reads, duplicate sends, silent message loss or broken recovery.

### Phase 5 — Groups, communities, channels and social updates

**Goal:** Complete safe social collaboration flows using real permissions and pagination.

- Groups: create/join, expiring/revocable invite links, roles, admin permissions, member lifecycle, announcements, moderation and audit history.
- Communities: design parent/child relationships and permission inheritance before implementing linked spaces.
- Channels: public/private discovery, follow/unfollow, posts, reactions, polls, counters, comments/discussion, moderation and protected content.
- Status/Stories: 24-hour expiry, audiences, selected recipients, viewers, replies, reactions, mute/report, private media and cleanup.
- Events/polls: create/respond/close, capacity/race handling, privacy, result visibility, time zones and reminders.
- Add keyset pagination and bounded rendering for every growing feed, directory and member list.

**Exit gate:** Two-account and multi-member authorization tests cover owner/admin/member/viewer and blocked relationships; expiry, pagination and moderation are verified.

### Phase 6 — Direct and group calling

**Goal:** Prove bidirectional media and reliable lifecycle on supported platforms.

- Verify incoming/outgoing/accepted/declined/cancelled/ended/missed states, history, redial and per-user deletion.
- Verify add/remove participants, direct-to-group promotion, participant admission and block rechecks.
- Verify audio/video switching mid-call, mute, camera, front/back camera, speaker/earpiece, Bluetooth, permissions, network changes, ICE restart and reconnect.
- Verify background/foreground, lock screen, native call receiver, notification delivery, route removal and process interruption.
- Verify stale-session cleanup and worker idempotency without disconnecting legacy clients unexpectedly.
- Screen sharing and picture-in-picture remain unshipped until platform/provider support, privacy and device acceptance are designed and verified.

**Exit gate:** Two physical devices exchange bidirectional audio/video, survive tested network/lifecycle changes and cleanly release sessions. Android and iOS evidence are separate.

### Phase 7 — Complete LIVE product

**Goal:** Move beyond the repaired core broadcast into the full safe, service-backed LIVE experience.

- Complete Hub discovery, creator studio/profile, broadcast, audio room, video chat room, guest queue, moderation, reports, leaderboard, analytics, post-live summary, replay library/player and settings.
- Complete five-guest admission, invitation/approval/expiry/history, role permissions, movable/resizable stage tiles, camera/microphone controls, spotlight, mute, remove, report and reconnect.
- Implement LIVE scheduling/events/reminders only with real time-zone-aware contracts.
- Battles, gifts, wallet/ledger, payouts and monetization remain blocked until product rules, fraud/abuse controls, idempotent transaction design, currency/unit conversion, legal review and zero-cost/provider feasibility are approved. Never show simulated balances or gifts.
- LIVE random matching is blocked until age assurance, explicit consent, blur-by-default, immediate block/report, evidence handling and minors' safety controls are designed and independently reviewed.
- Keep comments/reactions latency characteristics explicit; add secured realtime delivery only as a separately tested improvement.
- Validate replay upload, retention, private storage, signed playback, unauthorized denial, account switching, deletion and expiry end to end.

**Exit gate:** Each of the 18 LIVE experiences has complete discoverable flows and acceptance evidence; two-account and two-device tests pass; no unsafe or mock-only commerce/matching capability is exposed.

### Phase 8 — Advanced messaging and platform extensions

**Goal:** Add advanced features only after their product and security contracts are approved.

- Polls/quizzes, event enhancements, live location, view-once/self-destruct media, transcripts, richer formatting and message translation.
- Bots/API, Mini Apps, business automation/catalogues, subscriptions and paid media only after scoped permission, abuse, privacy, legal and cost designs.
- E2EE is not implied by Supabase RLS or private storage. Do not advertise E2EE or encrypted backup until an established audited protocol, per-device keys, identity verification, key rotation/revocation, recovery and threat model are implemented and independently reviewed.
- Encrypted backup/restore requires a separate key-recovery and portability design; a database export is not a chat backup.

**Exit gate:** Each capability has a written threat model, API/data contract, platform compatibility, cost decision, automated tests and explicit product acceptance before UI exposure.

### Phase 9 — Operations, backup/restore and release readiness

**Goal:** Prove the product can be operated, recovered and released safely.

- Complete the outstanding Phase 7 operations gates tracked in backend issue #24: useful request/latency telemetry where available, complete secured off-site backup inventory, and isolated restore rehearsal.
- Backup scope must explicitly account for schema, application data, required Auth records, Storage objects and configuration/secrets inventory. Never put secrets in the archive or repository.
- Rehearse restore against disposable infrastructure; do not restore over production.
- Verify worker health, retries, idempotency, locks, retention, cleanup, webhook authentication, alertable failures and log redaction.
- Verify production smoke tests, health/readiness, deployment SHAs, CORS/CSP, rate limits, dependency advisories and rollback procedure.
- Produce signed Android and iOS builds only after native dependency, permissions, signing, privacy and physical-device checks pass. Publishing requires separate explicit release authorization.

**Exit gate:** Reproducible backup/restore evidence, operational runbooks, production smoke evidence, release artifact validation and explicit go/no-go record.

## 4. Cross-phase acceptance checklist

For every vertical slice, record:

- [ ] Requirement and user journey linked to the canonical register.
- [ ] Current main and related PRs inspected; no duplicate or stale branch work.
- [ ] Frontend UI, loading/empty/error/offline/accessibility states complete.
- [ ] Backend validation, auth identity, authorization, rate limits and abuse controls complete.
- [ ] Data model, RLS, grants, Storage and migration requirements reviewed.
- [ ] Automated unit, contract, integration and security tests pass.
- [ ] Relevant web/native builds and dependency/bundle audits pass.
- [ ] Deployment SHA and environment are recorded; no assumption from READY status.
- [ ] Required two-account/browser/device/runtime acceptance is recorded.
- [ ] Documentation, support/operations notes and rollback are updated.
- [ ] No paid dependency, destructive action or production migration occurred without explicit approval.

## 5. Immediate work queue

1. Phase 0: validate the deployed PR #212 fix on the still-active Gas broadcast, without ending or duplicating it.
2. Phase 1: complete the read-only architecture, data/RLS/RPC/storage, worker and security-header maps.
3. Phase 2: reconcile PR #85's unique Crown Aurora changes and establish the 48-experience visual/accessibility scorecard.
4. Phase 3: close the existing two-account privacy and block/status acceptance gaps.
5. Phase 4–9: proceed sequentially, opening small fresh-main PRs per vertical slice and updating the canonical delivery register after each verified milestone.

**Explicitly not authorized by this plan:** production migrations, production data mutations, account deletion, ending active broadcasts, paid infrastructure, signing/publishing releases, enabling paid provider features, weakening security controls, or claiming physical-device acceptance without actual tests.
