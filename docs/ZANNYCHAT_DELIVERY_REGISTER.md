# ZannyChat Master Delivery Register

**Status:** LIVE-first implementation active; all non-LIVE work paused  
**Last reconciled:** 2026-11-19  
**Companion charter:** [Master Product, Architecture & Design Blueprint](./ZANNYCHAT_MASTER_BLUEPRINT.md)

> This is the single execution ledger. Update each row with an owner, source path, PR/commit, tests, deployment evidence and next action. Status labels describe evidence, not optimism.

## Status vocabulary

- **Accepted:** verified in production against explicit acceptance criteria.
- **Implemented:** code exists; production acceptance may still be outstanding.
- **Merged:** merged to main; not automatically deployed or accepted.
- **In review:** open PR awaiting review/CI/merge.
- **In progress:** active implementation.
- **Not started:** no verified implementation.
- **Blocked:** dependency or risk prevents safe progress.
- **Needs revalidation:** prior evidence is stale or incomplete.

Never infer Accepted from route presence, a green build, a prototype, a merged PR or a successful deployment alone.

## 1. Project state snapshot

| Area | Last known evidence | Current register status | Required reconciliation |
|---|---|---|---|
| Crown Aurora direction | Frontend audit records palette, contrast principles and initial shared component work | Needs revalidation | Inspect current main and all open UI PRs; do not revive closed PR #85 blindly |
| LIVE core UX | PR #170/#172/#176 and #189 merged; current main has six dedicated LIVE routes (Hub, Broadcast, Creator Preflight, Replay Library, Replay Player, Creator Studio). The Studio screen is still named/routed as LiveCreatorProfile; public creator identity/impact is currently the general PeerProfileScreen with LiveImpactCard. Audio Room and Video Chat remain modes within Broadcast. | Core merged; pre-flight implemented; 18-screen audit not yet accepted | Preserve LiveKit/media behaviour; separate Studio/Profile route semantics, finish missing screens, flows, safety, states and device acceptance |
| LIVE backend | Current src/routes/liveStreams.js exposes discovery, broadcast lifecycle, join/leave, comments, reactions, guest requests/invites, participants, moderators, reports, follows, creator profile and replay endpoints | Core endpoints exist; domain coverage incomplete | Map every endpoint to UI, authorization, RLS, rate limits and integration tests; no assumed gift/battle/wallet/leaderboard API |
| LIVE migrations | Two named migrations applied through successful guarded workflow run 44501209658 | Applied; do not rerun | Verify migration history only if needed; any correction is a new forward migration |
| Replay | One production READY row and matching private MP4 object were verified; signed playback route reviewed | Artifact verified; player/access acceptance partial | Exercise authenticated playback, expired link, unauthorized viewer denial and native/web playback |
| Full app inventory | 48 unique screen modules / 49 RootStack entries / 45 unique route names after PR #189; 48 experiences remains the product audit inventory | Current source count | Reparse current route registry after every screen addition; do not conflate route declarations with experiences |
| Parity scope | Retrieved parity gap analysis based on supplied original audit | Scope recorded; original source not re-opened in this pass | Retrieve original source before claiming any missing detail |
| Account isolation | PRs #146/#147 merged in a previous audit; two-account acceptance was outstanding then | Needs revalidation | Run two-account tests across chat/media/realtime/calls/LIVE |
| Backend deployment | Historical audit reported main/deploy SHA divergence; PR #151 later deployed | Needs revalidation | Compare current main SHA to Render deploy SHA |
| Production frontend | Latest confirmed production alias serves commit `1060ca0e8eae49dab427420c7200d526a1fde710`; PR #189 merged as `99811698c3f33516f61b667c5bce25a95108efe1`, but its Vercel check failed on the team build-rate limit | Merged, not deployed; production SHA remains last-known and needs revalidation | Restore preview/deploy capacity, verify exact SHA and run production LIVE smoke tests |

## 2. PR reconciliation — LIVE-first checkpoint (2026-11-19)

Recent GitHub state was rechecked before this priority change:

| PR | Scope | Observed state / handling |
|---|---|---|
| [#170](https://github.com/Zanny001/zannychat-frontend/pull/170) | Crown Aurora LIVE redesign | Merged; preserve and extend current implementation |
| [#172](https://github.com/Zanny001/zannychat-frontend/pull/172) | Responsive Crown Aurora refinements | Merged |
| [#176](https://github.com/Zanny001/zannychat-frontend/pull/176) | Video LIVE Chat and Audio LIVE Room modes | Merged |
| [#175](https://github.com/Zanny001/zannychat-frontend/pull/175) | Earlier guest-control branch | Closed unmerged; inspect its unique delta before reusing anything |
| [#177](https://github.com/Zanny001/zannychat-frontend/pull/177) | Canonical Master Blueprint and Delivery Register | Merged; these are the governing documents |
| [#184](https://github.com/Zanny001/zannychat-frontend/pull/184) | Chat timeline row extraction | Merged before LIVE priority reset; no further Chat work authorised in this phase |
| [#185](https://github.com/Zanny001/zannychat-frontend/pull/185) | Chat timeline lifecycle hook | Merged before LIVE priority reset; no further Chat work authorised in this phase |
| [#186](https://github.com/Zanny001/zannychat-frontend/pull/186) | Chat message outbox hook | Merged before LIVE priority reset; no further Chat work authorised in this phase |
| [#187](https://github.com/Zanny001/zannychat-frontend/pull/187) | LIVE-first delivery register and source reconciliation | Merged; canonical register updated |
| [#188](https://github.com/Zanny001/zannychat-frontend/pull/188) | First creator pre-flight branch | Closed as superseded by #189; no implementation was dropped |
| [#189](https://github.com/Zanny001/zannychat-frontend/pull/189) | Creator pre-flight, media permissions, native permission explanations and contracts | Merged as `99811698c3f33516f61b667c5bce25a95108efe1`; GitHub quality and Advanced Calling workflows passed; Vercel deployment blocked by build-rate limit |

PR #189 is merged; no open LIVE implementation PR remains in this focused set. Do not revive closed branches wholesale or duplicate merged work. The user has paused further Chat implementation; keep all new execution focused on LIVE until explicitly redirected.

## 3. Product domains and acceptance backlog

### A. Foundation, architecture and governance

| ID | Deliverable | Acceptance evidence | Status |
|---|---|---|---|
| A-01 | Maintain this blueprint and one delivery register | Both documents versioned in GitHub; every active task links here | In progress |
| A-02 | Reconcile frontend/backend main, active PRs, CI and deployment SHAs | Dated evidence for both repos and production services | Needs revalidation |
| A-03 | Map actual frontend domain/module boundaries and dependencies | Current route/module inventory, dependency map, ownership and duplication findings | Not started |
| A-04 | Map backend routes, services, workers and provider adapters | Route-to-domain map, data flow and external dependency inventory | Not started |
| A-05 | Map Supabase tables, RPCs, triggers, RLS, storage and migration history | Production-aware schema/security map with owner and purpose | Not started |
| A-06 | Establish feature contracts and error/result conventions | Shared typed contracts and regression tests | Not started |
| A-07 | Add operational/rollback runbooks and deployment evidence | Health, logs, backup/restore and rollback procedures verified | Not started |

### B. Design system and complete interface audit

| ID | Screen / system | Acceptance evidence | Status |
|---|---|---|---|
| UI-01 | Design tokens, typography, semantic themes, spacing, radii, elevation, motion | Token inventory, theme matrix and contrast tests | Needs revalidation |
| UI-02 | Shared Header, GlassCard, buttons, fields, rows, sheets, dialogs, tabs, navigation | Shared component catalogue and visual/interaction tests | Needs revalidation |
| UI-03 | Main / Chats | Responsive visual review; pagination, unread, filters, search, empty/error/offline states | Merged — PR #178 bounded inbox; visual acceptance still pending |
| UI-04 | Chat | Composer, messages, replies, media, actions, receipts, keyboard and reconnect states | Architecture slices #184–#186 merged; visual/keyboard/accessibility acceptance paused until LIVE phase ends |
| UI-05 | New Chat / contact discovery | Search, permissions, keyboard, bounded list, empty/error states | Merged — PR #179 bounded contacts; visual acceptance still pending |
| UI-06 | Forward Message, Saved Messages, Drafts, Pinned Messages, Chat Folders | Real data, bounded rendering, actions, state and accessibility checks | Merged — PR #180 bounded collections; visual acceptance still pending |
| UI-07 | Shared Media / Chat Appearance | Responsive media bounds, filtering, theme preview and persistence | Not started |
| UI-08 | Updates / Stories | Creation, viewing, audiences, expiry, viewers, reactions, replies, mute and reporting | Merged — PR #181 virtualized Stories/Friends rail; feature parity incomplete |
| UI-09 | Calls family | Incoming/outgoing, history, direct/group call, participant and failure states | Needs revalidation |
| UI-10 | LIVE family | All 18 audited experiences, 32 capabilities, safety and state coverage | Core and creator pre-flight merged; detailed 18-screen acceptance evidence needed |
| UI-11 | Auth family | Onboarding, login/signup, OTP, recovery/reset, validation and error states | Not started |
| UI-12 | Profile/account family | Profile/edit, peer profile, QR, sessions, settings, notifications | Not started |
| UI-13 | Privacy/data/support family | Privacy/security, export, storage, help, account lifecycle | Not started |
| UI-14 | Channels / Explore / Groups / Events / Polls | Discovery, management, admin, posting and moderation flows | Not started |
| UI-15 | Responsive + accessibility matrix | Narrow/common/large phone, tablet, desktop; keyboard, screen reader, high contrast, text scale, reduced motion | Not started |
| UI-16 | Physical-device verification | Android 10/11 and modern Android; supported iOS device; media/call permissions and lifecycle | Not started |

### C. Messaging reliability and advanced communication

| ID | Deliverable | Acceptance evidence | Status |
|---|---|---|---|
| MSG-01 | Reliable send/edit/delete/reply/forward/reaction/pin/save | Two-account integration tests; correct ordering and ownership | Needs revalidation |
| MSG-02 | Delivery/read states and unread consistency | Server-authoritative state and reconnect tests | Not started |
| MSG-03 | Media upload/download, progress, retry, cancellation and cleanup | Private storage tests, interrupted-network tests, signed URL expiry | Needs revalidation |
| MSG-04 | Offline queue and reconnect reconciliation | No duplicate/lost messages under network interruption | Not started |
| MSG-05 | Search across chats, contacts, groups and messages | Permission-aware search and pagination tests | Implemented partially; needs revalidation |
| MSG-06 | Scheduled/silent messages and notification delivery | Worker schedule evidence, opt-out compliance and failure handling | Needs revalidation |
| MSG-07 | Advanced message types (polls/quizzes, events, location, view-once, transcripts, formatting) | Per-type product/API/data/security/UI contract and tests | Not started |

### D. Social, groups and channels

| ID | Deliverable | Acceptance evidence | Status |
|---|---|---|---|
| SOC-01 | Full Stories/Status vertical slice | 24-hour expiry, audience enforcement, viewers/replies/reactions, cleanup | In review / incomplete |
| SOC-02 | Groups and advanced administration | Roles, permissions, invite expiry/limits, join requests, logs, slow mode | Not started |
| SOC-03 | Communities and announcement spaces | Parent/child model, permissions, discovery and moderation | Not started |
| SOC-04 | Channels | Public/private discovery, follower management, posts, reactions, polls, counters, comments/discussion, protected content | Not started |
| SOC-05 | Events and polls | Real create/respond/close flows, privacy, results and abuse controls | Not started |

### E. Calls and LIVE

| ID | Deliverable | Acceptance evidence | Status |
|---|---|---|---|
| CALL-01 | Direct audio/video call reliability | Two accounts hear/see each other; permissions, reconnect, cleanup | Needs revalidation |
| CALL-02 | Mid-call audio/video switching | Switch without dropping session; device/permission tests | Needs revalidation |
| CALL-03 | Group calls and participant management | Add/remove, mute, role and leave/end semantics | Needs revalidation |
| CALL-04 | Call history, privacy and recovery | Server history, missed/failed states, session cleanup | Needs revalidation |
| LIVE-01 | 18-screen Crown Aurora LIVE experience | All 18 experiences responsive, accessible, state-complete and connected to actual services | Core and pre-flight merged; detailed audit incomplete |
| LIVE-02 | Broadcast/Audio/Video room modes | Mode-specific permissions and correct media publishing | Creator pre-flight permission gating merged; physical-device permission/media acceptance pending |
| LIVE-03 | Five-guest queue/invites/approval/removal | Enforced five-guest limit and authorization tests | Implemented; production revalidation |
| LIVE-04 | Movable/resizable guest tiles | Bounded drag/resize on supported devices and reduced-motion fallback | Implemented; device QA needed |
| LIVE-05 | Chat/comments/reactions/moderation/reports | Two-account delivery, rate limits, hide/block/report and moderator permissions | Needs revalidation |
| LIVE-06 | Battles/events/gifts/wallet/leaderboard/analytics | Real transactional models, abuse controls, clear Naira/unit conversion and audit trail | Not started / verify existing partial code |
| LIVE-07 | Replay recording/library/player | Egress completion, DB row, private object, signed playback, unauthorized denial | One production READY row + matching private MP4 object verified; signed playback code reviewed; actual viewer playback/denial runtime test remains |
| LIVE-08 | LIVE discovery/creator profile/notifications/settings | Real data, privacy and navigation | Creator Studio exists as owner dashboard under the LiveCreatorProfile route; public Creator Profile is currently the general PeerProfileScreen with LiveImpactCard; LIVE entry-point split needed |
| LIVE-09 | LIVE safety | Age/consent/blur/report/evidence and minor-safety controls | Blocked before random matching ships |


### LIVE screen inventory — 18 audited experiences

The 18 screens in the supplied Crown Aurora audit are nested within the wider 48-experience application inventory. A dedicated route is not required for every transient panel, but each experience below must have a complete, discoverable flow, accessible states and a clear owner. Current source inspection found six dedicated LIVE routes. The owner Creator Studio is currently routed as LiveCreatorProfile; the public Creator Profile experience is the general PeerProfileScreen with LiveImpactCard and still needs a clear LIVE entry point.

| # | Experience | Current source evidence | Required delivery |
|---:|---|---|---|
| 1 | LIVE Hub / Discover | Dedicated LiveHubScreen; discovery, follow, invite and start setup exist | Finish discover hierarchy, categories/region/search, pagination and all loading/empty/error/offline states |
| 2 | Creator Studio | Dedicated owner workspace exists in LiveCreatorProfileScreen and is titled "Creator studio"; the route name is misleading | Rename the route to LiveCreatorStudio; complete scheduling/policy gates, live controls, guest/moderation workspaces and post-live review. Creator pre-flight is merged. |
| 3 | Broadcast Room | Dedicated LiveStreamScreen with LiveKit stage, chat, reactions and controls | Complete connection/buffering/reconnect/permission/end states, safe areas, accessible overlays and low-power mode |
| 4 | Audio Room | audio_room experience mode in Broadcast Room | Complete audio-first stage, speaker seats, host controls, speaking indicators and audio-route behaviour |
| 5 | Video Chat Room | video_chat experience mode in Broadcast Room | Complete themed multi-guest layout, tile drag/resize/focus and participant lifecycle |
| 6 | Battles | No dedicated route or battle endpoint identified in current LIVE router | Design invite/accept/rules/round/result/rematch, safety and transactional scoring before UI claims functionality |
| 7 | Events and reminders | Global Events screen exists; LIVE-specific event journey is not evidenced | LIVE event discovery/detail, schedule, RSVP/reminder, creator management and time-zone handling |
| 8 | Replay Library | Dedicated LiveReplayLibraryScreen | Finish pagination/filters, thumbnails where available, processing/failure/expiry and owner actions |
| 9 | Replay Player | Dedicated LiveReplayScreen using authenticated playback endpoint | Verify real playback on web/native, expiry, account switch, access denial, retry and deletion |
| 10 | Creator Profile | PeerProfileScreen already includes privacy-aware LiveImpactCard; currently a general profile route, not a LIVE-linked creator entry point | Link from LIVE discovery and the stream stage; add creator follow/current-live CTA and preserve public privacy rules without duplicating generic profile data |
| 11 | Leaderboard / Crown Race | No dedicated route or leaderboard endpoint identified in current LIVE router | Define ranking windows, eligibility, anti-manipulation, privacy and auditable score source |
| 12 | Gifts / Gift Tray | In-room presentation surface exists; no gift transaction endpoint identified in current LIVE router | Real catalogue, balance check, spend confirmation, idempotent transaction, animation, receipt and inventory |
| 13 | Wallet and Payouts | No dedicated LIVE wallet route or payout endpoint identified in current LIVE router | Balance ledger, top-up/provider billing, receipts, restore, KYC, bank selection, withdrawal and disputes |
| 14 | Creator Analytics | Creator impact summary exists in profile; no complete analytics experience verified | Dedicated date-range dashboard with real metrics, definitions, empty states and export/access controls |
| 15 | Moderation | Moderator controls are embedded in Broadcast Room | Dedicated moderation workspace, queue, roles, actions, evidence and audit trail |
| 16 | Guest Queue | Guest request list is embedded in Broadcast Room | Full queue with pending/approved/declined/expired states, invite delivery and strict five-guest capacity |
| 17 | Reports | Report review panel is embedded in Broadcast Room | Report inbox/detail, evidence, severity, assignment, action, appeal and audit history |
| 18 | LIVE Settings | No dedicated LIVE settings route identified | Creator/viewer preferences, privacy, notifications, data saver, blocked/muted users, language/region and account controls |

### Additional required LIVE screens and journeys from the audit

- Viewer first-run / age gate / region eligibility / camera-microphone-notification permission primers.
- Creator onboarding, identity verification/KYC where required, creator policy acceptance and payout setup.
- Creator pre-flight checklist (PR #189 merged); scheduled LIVE setup, end-live confirmation and post-live summary remain required.
- Safety Centre, blocked/muted users, report evidence review, strikes and appeals.
- Gift inventory, purchase pending/failed/success, receipts and restore purchases.
- Support and disputes, notification preferences, data-saver mode, language/region settings and viewing history.
- Conference waiting room, join-link handling, participant consent and recording consent.

### Required state matrix for every LIVE screen

Loading/skeleton; populated; empty; recoverable error/retry; offline; connecting; buffering; reconnecting; camera/microphone permission denied; device unavailable; age/region restricted; private/invite-only denial; rate-limited comments/reactions/gifts; payment pending/failed/cancelled; moderation-hidden content; expired replay; success confirmation; destructive-action confirmation. Include screen-reader announcements and reduced-motion equivalents.

### LIVE quality and safety gates

- Safe areas: top max(54pt, inset), bottom max(34pt, inset), 16pt side margin; never hard-code status-bar offsets as a substitute for safe-area insets.
- Contrast: repair LIVE pill and primary button combinations from the audit; never put text directly on aurora artwork without a legible scrim/surface.
- Targets: minimum 44×44pt hit area; labels for icon-only actions; visible keyboard/focus state on web.
- Design system: bind colours to theme semantics; consolidate to eight type steps, a 4pt spacing grid and five radii; glass max four layers per screen with solid fallback.
- Motion: shared timing/easing, reduced-motion and low-power paths; animate transform/opacity; cap particles and avoid blur-driven animation.
- Safety: no anonymous random video matching; Live Match stays disabled/gated until age assurance, consent, blur-by-default, report/evidence, moderation staffing, block and regional kill-switch controls are approved.
- Payments: no gift, coin, wallet or payout success UI until provider, billing, ledger, refund, fraud, KYC and legal requirements are implemented and tested.
- Acceptance: viewer and creator usability tests, TalkBack/VoiceOver, text scaling, low-end Android, weak network and two-account authorization tests.


### F. Privacy, security and platform integrity

| ID | Deliverable | Acceptance evidence | Status |
|---|---|---|---|
| SEC-01 | Full RLS and ownership audit | Table-by-table policies plus allowed/denied two-account tests | Needs revalidation |
| SEC-02 | RPC/function security audit | Grants, SECURITY DEFINER, search_path, input validation and role tests | Needs revalidation |
| SEC-03 | Storage access audit | Public/private bucket intent, object ownership, signed URL tests | Needs revalidation |
| SEC-04 | Auth/session/device security | Token refresh, revocation, expiry, session isolation and recovery | Needs revalidation |
| SEC-05 | CORS, webhook and secrets review | Explicit origins, signature validation, secret rotation/no leakage | Needs revalidation |
| SEC-06 | Data export/deletion and retention | Verified export, deletion integrity, cleanup and audit evidence | Needs revalidation |
| SEC-07 | E2EE architecture and threat model | Independent protocol review, device keys, verification, revocation and recovery | Not started; do not claim E2EE |
| SEC-08 | Encrypted backup/restore | Key recovery, cross-device restore and security review | Not started |
| SEC-09 | Abuse prevention and moderation | Rate limits, reports, blocks, evidence retention, appeals and operational workflow | Needs revalidation |

### G. Platform expansion (gated, not assumed shipped)

| ID | Deliverable | Acceptance evidence | Status |
|---|---|---|---|
| EXT-01 | Linked-device QR pairing | Per-device identity/key lifecycle, approval, revocation and tests | Not started |
| EXT-02 | Bot API and bot permissions | Versioned API, scopes, abuse controls and developer docs | Not started |
| EXT-03 | Mini Apps | Sandboxing, permission model, origin isolation and review process | Not started |
| EXT-04 | Business tools/catalogues | Business identity, admin roles, customer privacy and workflows | Not started |
| EXT-05 | Monetization/subscriptions/paid media | Payment provider, compliance, fees, refunds, fraud and audit controls | Blocked pending product/legal/provider review |

## 4. Release gates

A release cannot pass until applicable gates have recorded evidence:

1. **Source gate:** clean diff, reviewed PR, no duplicate implementation, no secrets.
2. **Contract gate:** unit, contract, integration and regression tests pass.
3. **Security gate:** ownership, RLS, RPC, storage, CORS and two-account tests pass.
4. **UX gate:** responsive layout, accessibility, keyboard, theme and reduced-motion checks pass.
5. **Platform gate:** web export and applicable Android/iOS build/device checks pass.
6. **Data gate:** migration compatibility, backup, forward-only plan and rollback strategy verified.
7. **Operations gate:** health/readiness, logs, workers, provider dependencies and alerts checked.
8. **Deployment gate:** exact commit deployed; production smoke tests and rollback readiness recorded.
9. **Acceptance gate:** user-visible flow works with real accounts and real data; evidence is linked here.

## 5. Immediate execution order — LIVE ONLY

1. Freeze new Chat and unrelated product work. Do not extend the Chat PR sequence while LIVE is the active priority.
2. Reconcile all current LIVE frontend routes, components, backend endpoints, workers, LiveKit permissions, Supabase tables/RLS/storage and historical LIVE PRs. Reuse verified work; do not revive stale branches blindly.
3. Build the LIVE foundation: semantic Crown Aurora tokens, safe areas, accessible controls, consistent navigation, responsive layouts, motion/performance budgets and a complete state matrix.
4. Complete the creator lifecycle: onboarding, policy/age gates, creator setup, pre-flight (merged; device acceptance pending), scheduling/reminders, go-live, end confirmation and post-live summary.

**Next LIVE vertical slice:** separate the existing owner Creator Studio route from the public Creator Profile entry point. Rename the owner route to LiveCreatorStudio; reuse the privacy-aware PeerProfileScreen/LiveImpactCard as the public profile; add clear entry points from LIVE discovery and the stream stage.

5. Complete the viewer lifecycle: discovery, preview, join/leave, reconnect/buffering, comments, reactions, follow/remind, gifts only when backed by real transactional services, post-live and viewing history.
6. Complete guest/conference lifecycle: guest queue, invitations/approval, five-guest cap, movable/resizable tiles, participant roles, waiting room, recording consent, captions/accessibility and reliable room teardown.
7. Complete safety lifecycle: report user/content/comment, evidence capture/retention, block/mute, moderation queue, strikes/appeals, age/region restrictions, minor-safe defaults and emergency stream/region kill switches. Live Match remains gated and is not to ship anonymously.
8. Complete replay acceptance: production Egress → webhook → finalizer → private object → authenticated signed playback → expiry/deletion and unauthorized denial on web and native.
9. Design and implement gifts, wallet, inventory/receipts, leaderboards, battles, events, Circles, creator analytics and payouts as separate vertical slices with real APIs, transactional records, anti-fraud, billing/KYC/legal review and clear NGN/coin conversion. Do not show fake balances or success states.
10. Add the remaining LIVE settings, notification preferences, support/disputes, data-saver, language/region, blocked/muted lists and viewing history screens/flows.
11. Validate every LIVE screen on narrow/standard/large phones, tablet, desktop/web, Android 10/11 and current supported Android/iOS devices. Run screen-reader, 130% text, keyboard, reduced-motion, low-power and weak-network checks.
12. Update this register with evidence after each vertical slice. Do not mark Accepted from route presence, static code, mock data, green CI or deployment alone.

## 6. Session handover checklist

At the start of every work session:
- Read this register and the Master Blueprint.
- Check current main SHA in both repositories.
- List open PRs and inspect overlapping files.
- Check latest CI results and failed jobs.
- Check current Vercel/Render deployment SHAs and status.
- Check Supabase migration history before any DB action.
- Identify the single highest-priority unblocked item and continue it.
- Update this register with the exact checkpoint before ending.

At the end of every work session:
- Record changes, PR/commit, CI run, migration/deployment evidence, test results and unresolved blockers.
- Update statuses truthfully.
- Leave one precise next action and its dependencies.
- Never mark the overall programme complete until every in-scope requirement is Accepted or explicitly descoped with the user's approval.


## 7. Verified source architecture baseline — 2026-11-19

This is a source-level inventory from frontend `main` at commit `99811698c3f33516f61b667c5bce25a95108efe1` (after PR #189) and backend `main` at `14860064a87c7637fc4f15dc6d75f4084b6f696a`. It is not a complete dependency/data-flow audit.

### Frontend
- Expo SDK `~57.0.32`, React `19.2.3`, React Native `0.86.3`, React Navigation 7, Supabase JS `2.117.3`, LiveKit React Native `3.1.0` and LiveKit client `2.23.0`.
- Entry point `App.js` owns startup orchestration: font readiness/fallback, session restoration timeout, Supabase auth-state subscription, push registration coordination, presence owner lifecycle, notification tap subscription and app error boundary.
- `src/navigation/AppNavigator.js` imports **48 unique screen modules**. It declares 49 RootStack.Screen entries with 45 unique route names because QRContact, JoinGroup, LiveStream and LiveReplay are each declared more than once for conditional/deep-link route handling; PR #189 adds LivePreflight. Six primary tabs are confirmed: Chats, Calls, LIVE, Updates, Channels (labelled Explore) and Profile.
- The older 46-module inventory is therefore stale against this current source snapshot. Keep the historic 46/48 count as provenance for the 17 Nov audit, but use 47 imported modules / 48 stack declarations / 44 distinct route names as the current parsed baseline until a complete registry script independently verifies it.
- Current package scripts include unit contracts, release/contract/readiness/integrity audits, call recovery/native receiver checks and Expo web export. The workflow run triggered by PR #177 is currently in progress; record final results only after completion.

### Backend
- Node/Express API version `1.2.241`; a modular monolith with explicit route modules mounted by `src/index.js`.
- Current route modules observed: health, conversations, AI, internal webhook, LiveKit Egress webhook, link preview, safety, account, channels, discovery, calls, call history, group calls, LIVE streams and LIVE history. Mounts include `/health`, `/conversations`, `/ai`, `/link-preview`, `/safety`, `/account`, `/channels`, `/discovery`, `/calls/history`, `/calls`, `/group-calls`, two routers under `/live`, `/webhooks/livekit` and `/webhooks`.
- Background workers started by the API process include call invitation notifications, call-ended notification retries, group-call media cleanup, media participant/ended LIVE-room cleanup, stale call-session cleanup, account-storage cleanup and LIVE replay finalisation/recovery.
- Backend structure is therefore already domain-modular within one Express process; the next audit must inspect route-to-service/data dependencies and worker lifecycle before proposing architecture refactors. Do not split services just for architectural fashion.

### Open PR reconciliation note
- PR #149 was closed without merge after its unique 17 Nov production/catalog, migration, replay, security and screen-sequence evidence was reconciled into the canonical documents; do not revive its stale branch.
- PRs #151, #159, #160 and #161 were closed after fresh-main replacements #178–#181 were merged. Retain their pagination/privacy-picker follow-ups; do not describe those PRs as open.
- PR #177 merged the canonical blueprint/register. PR #187 later updated the LIVE-first delivery register. PR #189 merged creator pre-flight after frontend quality and Advanced Calling workflows passed; Vercel remained blocked by the team build-rate limit.

### Immediate architecture-audit tasks
1. Generate a current screen/route registry directly from `AppNavigator.js` and reconcile aliases/conditional declarations; avoid hand-maintained count drift.
2. Inventory frontend services/hooks/context/state and map each screen to service/API/domain ownership.
3. Inventory backend route handlers, service modules, data access, Supabase RPC calls and provider adapters.
4. Inventory every Supabase migration/table/view/function/trigger/RLS/storage policy and compare repository migrations with production migration history before any database change.
5. Map worker schedules, idempotency, retry semantics and observability; confirm which workers actually run in Render production.
6. Map LiveKit, push, email/OAuth and media storage dependencies, their environment keys, free-tier constraints and production health checks.


## 8. Live Supabase architecture/security snapshot — 2026-11-19

Read-only inspection of project `vithpppgyjmazxvogvno` at approximately 11:47 UTC. No schema, policy, data, storage or project setting was changed.

- Project status: `ACTIVE_HEALTHY`; PostgreSQL 17.6.1.155.
- Public schema: **64 tables; all 64 have RLS enabled**.
- **37 tables have no RLS policies**, but a direct privilege check found zero SELECT/INSERT/UPDATE/DELETE privileges for both `anon` and `authenticated` on those tables. This is consistent with backend/service-role-only tables. Do not add broad policies simply to silence the advisor.
- Public functions: 67 SECURITY DEFINER functions; all 67 have a pinned `search_path`; 28 are executable by `authenticated`; zero are executable by `anon`. The 17 Nov audit records that all 28 authenticated-executable SECURITY DEFINER functions were individually reviewed and bound to authenticated ownership, conversation participation, profile/status visibility or block rules. Revalidate those definitions and grants against the 19 Nov live catalog before marking the security workstream accepted; the advisor warning is not proof of a vulnerability by itself.
- Applied migration history: **106 migrations**, latest `20261118223000`. The latest two LIVE migrations are present in backend source and applied history: `20261118221000_live_experience_modes` and `20261118223000_block_removed_live_participants`. Never rerun them.
- Security advisor: 37 informational RLS/no-policy findings, 28 authenticated-executable SECURITY DEFINER warnings, and one leaked-password-protection warning. Leaked-password protection is not enabled on the current Free plan; keep this as a disclosed residual risk within the ₦0 constraint.
- Performance advisor: 61 unused-index INFO findings. Do not mass-drop indexes from this snapshot; low traffic and short observation windows can make useful indexes appear unused. Review query plans and usage over a meaningful period before any removal.
- Health advisor: no findings at snapshot time.
- Supabase Edge Functions: none listed.
- The backend contains dedicated LIVE stream/history routes, LiveKit Egress webhook verification, replay worker and replay finalizer source. This verifies source presence only, not that production recording produced an object or playable replay.

**Next security work:** re-open the prior 17 Nov function-by-function review and compare all 67 current public SECURITY DEFINER definitions/grants with that evidence; focus on changed/new definitions, delegated helpers and allowed/denied caller tests. Do not revoke grants or alter function security wholesale. For the 37 backend-only tables, retain the privilege model and add a documented role/access inventory so future migrations do not accidentally expose them.


## 9. Production deployment and PR health reconciliation — 2026-11-19

### Production deployments verified
- **Frontend Vercel:** latest production deployment returned `READY` for frontend main commit `55fb010fc11b58590c26d111772d3db2cc0e08f3`. This confirms the deployment artifact is ready; it does not prove every user flow has passed acceptance.
- **Backend Render:** service `zannychat-backend-1` is configured for `main`, free plan, Frankfurt, health path `/health/live`; latest live deployment is commit `14860064a87c7637fc4f15dc6d75f4084b6f696a`. This matches the latest backend commit observed. Backend main is not currently 55 commits ahead of the live deployment.
- No deployment was triggered by this audit.

### Open PRs: exact reconciliation
- PR #149 was closed without merge after its unique audit evidence was reconciled into the canonical register.
- PRs #151, #159, #160 and #161 were closed after their reviewed changes were ported to fresh-main replacements #178–#181 and merged.
- Vercel preview checks have repeatedly failed under the team's free build/deployment rate limit; this is an infrastructure/quota blocker, not evidence of an application test failure. Do not upgrade a paid plan under the ₦0 constraint solely to clear preview checks.
- PR #187 merged the LIVE-first register update. PR #189 merged after both required GitHub Actions workflows passed. Its Vercel check still failed with `upgradeToPro=build-rate-limit`; therefore its merge commit is not confirmed deployed to production.

**Merge rule:** The four performance PRs have green historical CI but are too far behind current main to merge safely. Do not merge a stale head. Reapply only the reviewed, still-needed deltas to fresh branches from current main, close superseded PRs after replacements are validated, and preserve any unique tests/behaviour.


## 10. Superseded PR replacement map — 2026-11-19

| Superseded PR | Replacement | Reapplied scope |
|---|---|---|
| #151 | [#181](https://github.com/Zanny001/zannychat-frontend/pull/181) | Stories feed and Friends rail virtualization; FlatList import corrected |
| #159 | [#180](https://github.com/Zanny001/zannychat-frontend/pull/180) | Saved/Pinned/Drafts/Forward/Folders render windows; bounded Drafts lookup and ID map |
| #160 | [#179](https://github.com/Zanny001/zannychat-frontend/pull/179) | New Chat bounded contact directory |
| #161 | [#178](https://github.com/Zanny001/zannychat-frontend/pull/178) | Chats inbox bounded render window |

PR #149 remains open but stale; unique 17 Nov production and screen-audit evidence is being reconciled into this canonical register. PR #177 remains the draft documentation programme.


## 11. Architecture map and design-system baseline — 2026-11-19

### Frontend design system (verified source)
- `src/theme/colors.js` defines nine built-in moods; `royalNeon` is the default Crown Aurora palette. The semantic model is Signal & Thread: the current user's voice/action uses `signal`, the other participant accent uses `thread`.
- `ThemeContext` persists system/light/dark appearance, mood selection, custom palettes, text scale (`standard`, `large`, `extraLarge`) and high-contrast preference.
- Shared primitives include `Header`, `GlassCard`, `GlassInput`, `InputBar` and ChatBubble. Blur is decorative; Android API 30 and below must retain the solid-tint fallback.
- Typography uses Space Grotesk for display/numeric emphasis and Manrope for readable body text.
- Existing composer behaviours (draft persistence, attachments, retry/recovery, message actions) are product-critical. Do not replace the composer with a static mockup.

### Frontend domain/service dependency map (sampled current main)
- Inbox: `api`, `presence`, `supabaseClient`, `chatFolders`, `statusUpdates`, status/story utilities.
- Chat: `api`, `presence`, `calls`, `supabaseClient`, message/attachment outboxes, media preferences, saved/pinned messages, drafts, chat appearance and read-receipt utilities.
- New Chat: `api`, `presence`, `supabaseClient`, calls and member-favorites utilities.
- Status: `api`, `statusUpdates`, media recovery, audience/privacy selection, expiry and grouping utilities.
- Channels: `backendClient`, `api`, channel pagination, directory, drafts, validation and publish guards.
- Calls: `calls`, `backendClient`, `supabaseClient`, native call system, call policy and network status.
- LIVE: `backendClient`, `api`, `supabaseClient`, LiveKit-facing routes/services and discovery utilities.
- Profile/privacy: `api`, `backendClient`, `supabaseClient`, Google auth, auth validation and privacy checkup.

This confirms a shared API/data layer with domain utilities, but some screens directly coordinate multiple clients/services. The next architecture pass must map ownership and avoid creating a second competing API/state layer.

### Backend modular-monolith route map (verified current source)
Express route modules mounted by `src/index.js`:
- Health, conversations, AI, internal notifications/webhooks, LiveKit Egress webhook, link preview, safety, account, channels, discovery, calls, call history, LIVE history, group calls and LIVE streams.
- Shared middleware includes auth and rate limiting. Provider/data adapters include Supabase admin, push, LiveKit tokens, LiveKit room administration, LiveKit Egress and replay finalisation.
- Seven worker modules cover replay lifecycle/recovery/retention, call-end notification retries, stale call-session cleanup, LIVE participant/room cleanup, group-call media cleanup, account-storage cleanup and call-invitation notifications.
- `src/index.js` schedules recurring work at 30-second and 60-second intervals and starts the LIVE replay worker. Verify actual worker health, idempotency, lock ownership and logs in production; source registration alone is not operational proof.
- Render service is configured for one free instance in Frankfurt, with `/health/live` as the service health path. Avoid adding separate paid services without a clear requirement and explicit cost approval.

### Browser security header finding
Current `vercel.json` and `netlify.toml` both set `frame-ancestors 'none'; base-uri 'self'; object-src 'none'` but do not set `default-src` or `script-src`. This provides useful frame/base/object restrictions but is not a complete script-loading/XSS CSP. Treat as a security-hardening task: inventory real Supabase, Render, LiveKit, OAuth, font and media origins; validate a report-only policy against the Expo web export; then enforce a least-privilege policy with a rollback path. Do not guess an allowlist or break production login/media/calls.

### Current UI performance implementation checkpoint
- PR #178 merged: inbox FlatList now renders an initial 12 rows, batches 10 every 50ms and retains a 9-window render range; existing pagination/realtime/account isolation remains.
- PR #179 merged: New Chat contact directory renders 12 initially, batches 12 every 50ms, with a 7-window range.
- PR #180 merged: Saved/Pinned/Drafts/Forward/Folders use bounded render windows; Drafts skips conversation lookup when empty, caps lookup at 100 and indexes conversations by ID.
- PR #181 is in review: Stories feed and Friends rail virtualization; current source import includes FlatList explicitly. Backend status response pagination and privacy-picker/private-reply list virtualization remain open.
- These are performance improvements, not final visual sign-off or device acceptance.



## 12. Current 48-experience screen audit matrix

This matrix follows the current navigator's 48 unique experiences (the `Main` route is a tab container, not counted as a separate experience). The historic 2026-11-16 source pass covered 46 registered screen modules; the current main imports 47 unique screen modules. The added `LiveReplayLibraryScreen` requires a fresh source/visual review. Historical source review is not runtime acceptance.

| # | Experience | Current implementation evidence | Remaining acceptance |
|---:|---|---|---|
| 1 | Onboarding | Static responsive onboarding module; source-reviewed historically | First-install, small-screen, reduced-motion and text-scale checks |
| 2 | Login | Credential form and explicit error states | Autofill/password manager, rate limits, anti-enumeration and device tests |
| 3 | Signup | Account creation and validation flow | Duplicate-account, verification delivery and recovery tests |
| 4 | Verify Email | Verification/resend flow | Delivery, cooldown, expiry and replayed-code rejection |
| 5 | Password Recovery | Recovery request form | Anti-enumeration, delivery and rate-limit acceptance |
| 6 | Password Reset | Reset form and validation | Expired/reused token, session invalidation and device tests |
| 7 | LIVE Replay Library | Dedicated route/module and creator-scoped management exist in main | Verify real recordings, ownership, filters, signed playback, deletion and account switching |
| 8 | Chats | Inbox FlatList render window merged in #178; existing server pagination/realtime retained | Visual density, search/filter/folder states, offline/retry and two-account acceptance |
| 9 | Chat | Composer, message list, outboxes, media, read receipts, reactions and message utilities integrated | Full send/read/edit/delete/reply/forward/media/voice-note/keyboard/offline regression |
| 10 | New Chat | Bounded contact directory merged in #179 | Permission, search, empty/error, invitation and two-account acceptance |
| 11 | Forward Message | Bounded FlatList merged in #180 | Large recipient list, selection, failure/retry and privacy acceptance |
| 12 | Saved Messages | Bounded local collection merged in #180 | Device-local disclosure, persistence, account switch and open-original-message checks |
| 13 | Drafts | Bounded list, 100-conversation lookup cap and ID map merged in #180 | Offline, stale conversation, account isolation and deletion acceptance |
| 14 | Pinned Messages | Bounded FlatList merged in #180 | Snapshot freshness, unpin permissions and open-original-message acceptance |
| 15 | Chat Folders | Bounded FlatList merged in #180 | Large folder set, ordering, persistence and empty/error acceptance |
| 16 | Shared Media | Media browsing module and private media services exist | Large media pagination, signed URL expiry, cache/cleanup and responsive bounds |
| 17 | Chat Appearance | Theme/appearance settings and persisted theme engine exist | Preview/persistence, all moods, light/dark/high-contrast and text-scale review |
| 18 | Peer Profile | Dedicated peer profile route | Visibility/block state, avatar privacy, actions and cross-account checks |
| 19 | QR Contact | QR share/scan route | Camera permission, malformed/expired QR and cross-account scan |
| 20 | Contact Discovery | Discovery route and backend rate-limit/privacy utilities | Permission denial, enumeration resistance and multi-account visibility |
| 21 | Create Group | Contact selection uses a bounded list; backend validates participants/invites | Multi-account creation, duplicate members, capacity and invite permissions |
| 22 | Group Management | Member/admin management; historical work virtualized roster | Backend roster pagination, role changes, admin-only actions and self-leave |
| 23 | Join Group | Invite acceptance flow | Expired, revoked, max-use, blocked and unauthorized invite acceptance |
| 24 | Channels / Explore | Channel directory/feed, posts, comments and reports; privacy-aware services | Full directory pagination/virtualization, discovery, moderation and private-channel tests |
| 25 | Polls | Validated keyset service and vote-count RPC; historical virtualization work | Multi-select, close time, duplicate vote, result privacy and two-account tests |
| 26 | Events | Event service with RSVP/create flows; historical keyset/virtualization work | Time-zone correctness, capacity, past/future filtering and RSVP race tests |
| 27 | Calls | Calls tab/call history and direct/group call services | Two-device audio/video, history, Bluetooth/speaker, reconnect and notification acceptance |
| 28 | Incoming Call | Dedicated incoming-call surface | Background/terminated delivery, decline/timeout and native receiver lifecycle |
| 29 | Outgoing Call | Dedicated outgoing/ringing surface | Cancel, timeout, remote decline, network loss and cleanup |
| 30 | One-to-one Call | LiveKit media surface and native call integration | Bidirectional audio/video, mid-call switch, route changes and reconnect on physical devices |
| 31 | Group Call | Group-call room and participant management | Add/remove, role permissions, media handoff and multi-device cleanup |
| 32 | LIVE Hub | Discovery/creator entry surface | Real discovery data, pagination, privacy filters, empty/error and navigation |
| 33 | LIVE Broadcast | Broadcast route with LiveKit, creator/guest/viewer permissions | Two-account media, comments/reactions, moderation and room end/leave lifecycle |
| 34 | Updates / Status | Updates tab; profile-avatar-first My Status behaviour | Expiry, audience privacy, viewer/reply/reaction and device acceptance |
| 35 | Profile | Profile route and persisted user data | Responsive layout, avatar privacy, actions and account-switch tests |
| 36 | Edit Profile | Profile update service | Validation, username uniqueness, media upload, persistence and cross-account isolation |
| 37 | Settings | Settings route and theme/accessibility preferences | Complete preference persistence, navigation, destructive confirmation and accessibility |
| 38 | Privacy & Security | Privacy/security service and recent-auth account deletion flow | Session/token revocation, visibility, block/report, deletion and RLS tests |
| 39 | Notifications | Persisted push opt-out and token lifecycle fix recorded in historical audit | Real device delivery, unregister, permissions, token refresh and account switch |
| 40 | Data Storage | Media quality/auto-download controls | Actual storage usage, low-storage behaviour and cleanup correctness |
| 41 | Data Export | Export request/status surface | Real export generation, download security, completeness and deletion lifecycle |
| 42 | Sessions | Session summary and revoke-other-sessions action | Cross-device revocation, expired sessions and refresh-token invalidation |
| 43 | Help | Local FAQ/support surface | Valid support destinations, accessibility and contact/support flow |
| 44 | LIVE Replay Player | Authenticated replay playback route | End-to-end Egress, webhook finalisation, private object, signed URL, expiry and unauthorized denial |
| 45 | LIVE Creator Profile | Creator profile/impact route | Owner identity, follow state, real impact data and privacy isolation |
| 46 | Scheduled Messages | Service/worker; historical bounded pending list and 100-recipient lookup | Time-zone, worker execution, cancellation, retries and search for older conversations |
| 47 | LIVE primary tab | Six-destination navigation includes LIVE | Selected state, safe areas, deep links, back behaviour and accessibility |
| 48 | Status Updates dedicated route | Dedicated StatusUpdates route shares the Updates implementation; #181 is current virtualization PR | Complete #181 CI, backend pagination, privacy picker/private reply list, keyboard and device tests |

**Important separation:** The 18-screen LIVE Design Audit is an additional nested experience/capability checklist and must be completed in addition to this 48-route matrix. See the LIVE-01 requirement and the Master Blueprint's LIVE section.


## 13. Merged implementation checkpoint — 2026-11-19 12:02 UTC

### Canonical documentation
- PR #177 merged as `ee4140badbe2b12a8b8f73e65ed586af063de847`.
- The two canonical documents now exist on frontend main:
  - `docs/ZANNYCHAT_MASTER_BLUEPRINT.md`
  - `docs/ZANNYCHAT_DELIVERY_REGISTER.md`
- PR #149 was closed without merge because its historical audit evidence was reconciled into the canonical documents; the old historical audit files were not merged as competing master registers.

### Interface/performance work merged
| PR | Merge commit | Result |
|---|---|---|
| #178 | `4ffe7df7aefac900d9517c46db7f0602a8c562d8` | Bounded inbox render window |
| #179 | `73d46f840ac2559c232b07332d8b08b907eae7f0` | Bounded New Chat contact directory |
| #180 | `b6a51f36ab8981071efddb9cd0405c4c0299a118` | Bounded Saved/Drafts/Pinned/Forward/Folders; Drafts lookup cap and ID map |
| #181 | `e1214f85b3bce25068d4c2ac187fd58483a4e8e8` | Virtualized Stories feed and Friends rail; explicit FlatList import |

The old PRs #151, #159, #160 and #161 were closed only after the above replacements were created from current main and merged. No user-facing features were removed.

### Production rollout status
- Vercel production deployment for code commit `e1214f85b3bce25068d4c2ac187fd58483a4e8e8` reached **READY** (deployment `dpl_59wCUkd3jSsUWbkxydsEAQYRXrvZ`). The docs-only main commit `9a8c568e35ad1392ef117a1f680eaf659e7b1057` reached **READY** (deployment `dpl_J3YW1cNxrsZvJzexCpe2GDLZcrr7`). After PR #184, latest main commit `90deac5913dbdf7fa610fcf4d98e94c67a6ce3a5` also reached **READY** (deployment `dpl_BPonjj69GFNzF4ByjzqmxodYuebn`), and the production alias `https://zannychat.vercel.app` was verified on it. The inbox/New Chat/collections/Stories performance work and the ChatMessageRow extraction are deployed.
- Backend Render remains live at `14860064a87c7637fc4f15dc6d75f4084b6f696a`; no backend source or database change was made in this interface pass.
- Supabase schema remains untouched; the 106-migration / 64-table snapshot remains the latest read-only audit.

### Next execution focus
1. Continue the LIVE-only programme; PR #189 added creator pre-flight but is not confirmed deployed because Vercel's team build-rate limit blocked its deployment check.
2. Next implement the Creator Studio/Profile separation: rename the owner dashboard route to LiveCreatorStudio and expose the privacy-aware public PeerProfileScreen/LiveImpactCard as the LIVE Creator Profile entry point.
3. Then create dedicated Guest Queue, Reports and Moderation experiences using the existing authenticated LIVE APIs; keep in-room compact controls available.
4. Complete creator policy/age gates, scheduling, end-live confirmation and post-live summary; then finish replay runtime acceptance.
5. Keep all Chat and unrelated work paused. The remaining Chat visual, keyboard, accessibility and attachment-outbox tasks stay recorded as pending, not active.


## 14. Screen-module complexity baseline — 2026-11-19

Measured from current frontend main after the #181 merge. Byte size and hook/function counts are source complexity indicators, not proof of defects; use them to prioritize safe modularization.

| Screen module | Source bytes | Hook calls | Named local functions | Service imports | Architecture action |
|---|---:|---:|---:|---:|---|
| ChatScreen | 100,812 | 80 | 42 | 11 | Highest-priority decomposition; separate message lifecycle, outboxes/media, header, message list and composer/overlays |
| ChannelsScreen | 77,812 | 60 | 1 | 2 | Separate directory, feed, composer, comments/moderation and pagination state |
| StatusUpdatesScreen | 75,427 | 63 | 3 | 3 | Separate feed, composer, audience/privacy sheet, expiry and playback |
| LiveStreamScreen | 70,108 | 66 | 4 | 2 | Separate room/session state, media stage, participants/guest queue, chat/reactions, moderation and controls |
| LiveHubScreen | 53,719 | 36 | 0 | 3 | Separate discovery data, creator dashboard and navigation/presentation |
| CallScreen | 38,193 | 42 | 0 | 4 | Separate call lifecycle, media/device routing and presentation controls |
| GroupCallScreen | 26,030 | 24 | 1 | 4 | Separate room/participant lifecycle from tile/control presentation |
| PrivacySecurityScreen | 30,362 | 20 | 4 | 4 | Separate privacy checkup, account deletion/reauth and session controls |
| ProfileScreen | 10,458 | 7 | 1 | 2 | Lower complexity; focus on visual/accessibility consistency and real data states |

### Refactor rules
- Do not rewrite a whole large screen in one pass. Extract one coherent responsibility at a time, preserving props, route contracts, data ownership and visible behaviour.
- Start with pure helpers and typed contracts; then hooks that own one lifecycle; then presentational components with explicit props.
- Keep screens as composition/orchestration layers. Avoid new global state or duplicate API clients.
- Each extraction needs regression contracts for account switching, stale async requests, cleanup/unsubscribe, retries and error states where applicable.
- Re-run the full `test:unit`, release/contract/readiness/integrity audits and relevant platform workflows.
- Chat visual/interaction acceptance is still pending, but explicitly paused while LIVE is the active priority. Resume only after the user redirects or the LIVE programme reaches its agreed completion gate.

### Chat screen inspection checkpoint — pending, not active
- Current `ChatScreen.js` already uses a bounded FlatList (12 initial rows, 10 per batch, 50ms batching, window 9) and `maintainVisibleContentPosition`.
- Message bubbles are capped at 76% width; media previews use a window-size-aware sizing helper.
- Header controls have compact and ultra-compact breakpoints (<480px and <380px), preserving call/video access on narrow phones while hiding lower-priority controls.
- Composer is a shared `InputBar` with reply/edit, draft persistence, attachment and voice-recording states. Do not replace these with static mockups.
- When Chat work resumes, review screenshot/runtime behaviour at 320/360/390/430px, keyboard-open and safe-area layouts, long-history anchoring, accessibility/focus order, media retry and two-account message states before making visual changes.


### Backend CORS verification — 2026-11-19
- Backend `src/config/corsOptions.js` explicitly allows `https://zannychat.vercel.app`, `https://zannychat.netlify.app`, and the legacy Netlify origin, plus configured `CORS_ORIGINS` / `CORS_EXTRA_ORIGINS`.
- Development localhost origins are added only outside production.
- Requests without an Origin (native/server-to-server) are allowed; browser origins not in the explicit set are rejected with 403. No wildcard production origin is configured.
- This source review matches the intended production CORS design. Still verify the Render environment's actual CORS variables and run a production browser preflight when investigating a new origin rejection.


### Chat architecture refactor checkpoint — paused
- PR #184 merged `ChatMessageRow`; PR #185 merged `useChatTimeline`; PR #186 merged `useMessageOutbox` before the LIVE priority reset.
- Those merges are historical context only. Do not start the attachment outbox, composer/media extraction or further Chat UI work during the LIVE-first phase.
- Remaining ChatScreen decomposition and visual acceptance are pending, not active.


## 15. LIVE replay production verification — 2026-11-19

Read-only production catalog/storage inspection confirms the first complete recording artifact is now present:

- One `live_stream_replays` row with `status=ready`.
- Associated LIVE stream is `ended`, visibility `public`, and the replay creator matches the stream creator.
- Recording duration: **43 seconds**.
- Database file size: **3,292,044 bytes**.
- A matching object exists in the private `live-replays` bucket at the recorded file path; object metadata size matches the database file size exactly and MIME type is `video/mp4`.
- Replay expiry is **2026-11-26 10:58:14 UTC** (seven-day retention).
- The five storage buckets are: public `avatars`; private `chat-media`, `live-replays`, `private-avatars` and `status-media`. The current storage policy inventory has 13 authenticated policies for avatars/chat/private-avatar/status media and no direct client policy for `live-replays`.
- Backend `GET /live/replays/:replayId/playback` requires authentication, rejects non-ready/expired/missing records, checks the stream's visibility and block/participant/follower/invite/moderator rules, then issues a 360-second signed storage URL. Creator-only deletion and seven-day retention cleanup are implemented.

**Acceptance distinction:** production Egress completion, database finalisation and private-object integrity are now verified. The actual authenticated playback request, signed URL response, browser/native video playback, expired-link behaviour and unauthorized-user denial have not been exercised in this read-only audit. Keep LIVE-07 at partial acceptance until those runtime checks pass. No replay row, object, policy, quota or migration was modified by this audit.

## 16. SECURITY DEFINER catalog reconciliation — 2026-11-19

A fresh read-only PostgreSQL catalog query agrees with the 17 Nov audit:
- 67 public SECURITY DEFINER functions.
- Zero without a function-level `search_path` setting.
- Zero EXECUTE grants to PUBLIC and zero to `anon`.
- Exactly 28 executable by `authenticated`.
- Neither `anon` nor `authenticated` has CREATE on schema `public`.

This confirms the catalog-level grant/search-path posture recorded in the earlier function-by-function review. It does not replace body-level review after future function/grant changes or adversarial tests of each RPC's ownership/authorization checks.


## 17. Chat timeline component extraction merged — 2026-11-19

- PR #184 merged as `90deac5913dbdf7fa610fcf4d98e94c67a6ce3a5`.
- `ChatMessageRow` now owns the presentation-only day separator and ChatBubble composition. ChatScreen retains message ownership, read/delivery status, reactions, search state and callbacks.
- Frontend quality, Advanced Calling bundle exposure/dependency/client quality workflows all passed; Netlify preview succeeded. Vercel preview remained pending due the team build quota.
- This is a component boundary extraction, not the full ChatScreen refactor. No API, database, RLS, storage, realtime, pagination or message lifecycle behaviour changed.
- The merged commit is not yet confirmed deployed to production at this checkpoint.

**Chat status:** this timeline slice is merged. Further Chat work is paused by the LIVE-first priority; do not create another Chat PR in this phase.


## 18. Chat timeline lifecycle hook merged and deployed — 2026-11-19

- PR #185 merged as `1060ca0e8eae49dab427420c7200d526a1fde710`.
- Initial history, cursor pagination, realtime message/reaction/typing/presence/read-state subscriptions, request-generation guards and focus cleanup now live in `src/hooks/useChatTimeline.js`.
- ChatScreen retains optimistic message mutations, composer/outbox/media and presentation. Account-switch reset delegates timeline state cleanup to the hook.
- The unit script includes `src/hooks/*.contract.test.js`; the merged hook contract tests run as part of the suite.
- Frontend quality passed with **949 tests, 0 failures**. Advanced Calling bundle, Android/iOS export and client-quality workflows passed.
- Vercel production deployment `dpl_ErZDvBGhx1UuS27KieHBkmHvuhpm` reached **READY**, and `https://zannychat.vercel.app` was verified on it. The timeline hook is live.

**Chat status:** text outbox is merged. Attachment outbox and remaining visual/keyboard/accessibility acceptance stay pending; no further Chat work is active during the LIVE-first phase.


## 19. Message outbox hook merged — 2026-11-19

- PR #186 merged as `a2f298b92b38c4c27a1ff058b5f6a4fa8cf4d23b`.
- Pending text-message state, persistence, backoff, foreground retry scheduling and manual retry now live in `src/hooks/useMessageOutbox.js`.
- It preserves the 50-message queue cap, request-ID idempotency, bounded oldest-first automatic batches, permanent/transient error distinction and authenticated-owner checks. Generation guards invalidate stale work on account/conversation changes.
- Manual retry now calls the outbox retry path directly instead of reusing `handleSend`, avoiding accidental interaction with composer edit state.
- Text and attachment retry locks are separate so a slow media retry does not block text recovery. Attachment outbox remains in ChatScreen for a later independent extraction.
- Frontend quality passed with **954/954 unit tests**, 0 failures; call-recovery, native call-receiver, release, contract and integrity audits passed. Advanced Calling web/Android/iOS bundle exposure, Android Kotlin compilation, iOS prebuild and client-quality checks all passed. Netlify preview succeeded.
- Vercel preview/production is blocked by the current team build-rate limit. Latest production alias still serves commit `1060ca0e8eae49dab427420c7200d526a1fde710`; the outbox merge `a2f298b` is **not yet deployed**. Do not claim it is live.
- Source complexity after the two Chat hooks: `ChatScreen.js` reduced from **100,812 bytes / 80 hook calls** to **85,287 bytes / 48 hook calls**; `useChatTimeline.js` is 10,491 bytes and `useMessageOutbox.js` is 7,501 bytes.

**Chat status:** attachment outbox/recovery and Chat visual/keyboard/accessibility acceptance remain pending. They are intentionally paused while LIVE is the active priority.


## 20. LIVE-first session resume checkpoint — 2026-11-19

**Active priority:** complete the supplied Crown Aurora LIVE audit and its additional required journeys. No new Chat implementation or unrelated product work is active.

**Chat pause:** PRs #184–#186 were already merged before the user redirected priority to LIVE. They are not unmerged/pending PRs; their remaining follow-ups (attachment outbox, composer/media extraction, visual/keyboard/accessibility and two-account acceptance) are recorded as pending only. Do not start them during this phase.

**Governing documents:** `docs/ZANNYCHAT_MASTER_BLUEPRINT.md` and this single delivery register. The supplied LIVE audit and messaging-parity gap analysis remain the scope inputs. Keep one execution ledger; do not create competing trackers.

**Current frontend main:** `99811698c3f33516f61b667c5bce25a95108efe1` (PR #189). Navigation now imports 48 unique screen modules and declares 49 RootStack.Screen entries / 45 distinct route names. Six dedicated LIVE routes exist: Hub, Broadcast, Creator Preflight, Replay Library, Replay Player and the owner Creator Studio (still named/routed as LiveCreatorProfile). Audio Room and Video LIVE Chat remain modes within Broadcast. The public Creator Profile experience currently reuses PeerProfileScreen with its privacy-aware LiveImpactCard, but LIVE discovery/stage entry points and creator-specific actions need a focused slice.

**Creator pre-flight delivered in PR #189:** LiveHub now routes creator setup into LivePreflight. It reviews title/description, audience, private invitees, guest setting and mode; requests microphone access for every mode and camera access only for Broadcast/Video LIVE Chat; mounts a local camera preview; requires preview readiness before video room creation; refreshes permission state on app resume; prevents duplicate permission prompts and duplicate create requests; and creates the authenticated room only after explicit Start LIVE confirmation. Native permission explanations were updated across Expo Camera, Image Picker, Audio, WebRTC and iOS Info.plist. No backend API, database, migration, RLS, storage or paid provider change was made.

**Validation for PR #189:** merged as `99811698c3f33516f61b667c5bce25a95108efe1`. Frontend quality and Advanced Calling workflows both passed: web and Android Expo exports; Android Kotlin compilation; iOS prebuild; unit, call-recovery and native call-receiver tests; phase-6 release quality; release/contract/integrity audits; dependency audit and bundle-exposure audit. Vercel status failed with the team build-rate limit (`upgradeToPro=build-rate-limit`); therefore the merge is **not confirmed deployed to production**. Latest previously confirmed production alias SHA remains `1060ca0e8eae49dab427420c7200d526a1fde710` until a new deployment is verified.

**Next immediate LIVE slice:** separate the existing owner Creator Studio from the public Creator Profile entry point. Rename the owner route to LiveCreatorStudio; reuse the existing privacy-aware PeerProfileScreen/LiveImpactCard for the public profile; add discover/stage entry points and a real follow/current-live action without duplicating profile data. Then implement dedicated Guest Queue, Reports and Moderation screens using the existing authenticated APIs. Keep compact in-room controls available.

**Still outstanding:** creator onboarding and policy/age gates; scheduling/reminders; end-live confirmation and post-live summary; viewer discovery/join/reconnect; guest/conference lifecycle; dedicated moderation/reports; settings/support; gifts/wallet/battles/events/leaderboard only after real transactional APIs and legal/provider gates; authenticated replay playback, expiry and unauthorized denial; all 18-screen state/accessibility/responsive checks; two-account and physical-device acceptance. No LIVE migration is currently needed for the pre-flight slice; do not rerun the two LIVE migrations already applied on 2026-11-19.

This is the current handoff point. Read this register and the Master Blueprint before further work.


## 21. LIVE creator pre-flight merged — 2026-11-19

- PR #189 merged to frontend main as `99811698c3f33516f61b667c5bce25a95108efe1`.
- Added `LivePreflightScreen` and the `LivePreflight` root route. Creator room creation is now deferred until explicit confirmation after media permissions and setup review.
- Audio Room requests microphone only. Broadcast and Video LIVE Chat request microphone and camera and require a ready local preview before creating a room.
- Permission status is refreshed when the app returns from device settings. Ref guards prevent duplicate permission prompts and duplicate room-create requests.
- Native camera/microphone permission explanations now cover LIVE use across Expo plugins and iOS Info.plist.
- Updated existing LIVE contracts to assert the new Hub → Preflight → Stream flow and registered the new screen in the accessibility inventory.
- Frontend quality and Advanced Calling workflows passed, including web/Android exports, Android Kotlin compile, iOS prebuild, all unit/release/contract/integrity tests, call recovery/native receiver, dependency and bundle-exposure audits.
- Vercel check failed solely on the team build-rate limit. Do not claim PR #189 is deployed to production; last confirmed production SHA remains `1060ca0e8eae49dab427420c7200d526a1fde710` pending fresh deployment verification.
- No backend, database, migration, RLS, storage or provider change was made.

