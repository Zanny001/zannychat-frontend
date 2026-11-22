# ZannyChat Master Delivery Register

**Status:** Full-product phased execution resumed; LIVE incident stabilization remains the immediate runtime priority  
**Last reconciled:** 2026-11-20  
**Companion charter:** [Master Product, Architecture & Design Blueprint](./ZANNYCHAT_MASTER_BLUEPRINT.md)  
**Execution sequence:** [Master Execution Phases](./MASTER_EXECUTION_PHASES_20261120.md)  
**Architecture evidence:** [Architecture and Security Snapshot](./ARCHITECTURE_SECURITY_SNAPSHOT_20261120.md)

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

**No mock-only LIVE delivery:** Every visible LIVE control must call a real authenticated service or a clearly labelled local-only preference. Every transactional capability must have server-side authorization, validation, idempotency where money/points/state can be duplicated, durable persistence, abuse controls, observable failure states and automated tests. Never ship fake viewers, invented scores, simulated gifts, placeholder balances or decorative controls that imply a completed transaction. A screen is not complete until its full service path and acceptance evidence are recorded.

## 1. Project state snapshot

| Area | Last known evidence | Current register status | Required reconciliation |
|---|---|---|---|
| Crown Aurora direction | Frontend audit records palette, contrast principles and initial shared component work | Needs revalidation | Inspect current main and all open UI PRs; do not revive closed PR #85 blindly |
| LIVE core UX | PR #191, #193, #194 and #195 merged; main has dedicated Hub, Broadcast, Creator Preflight, Creator Studio, Replay Library, Replay Player, Guest Queue, Moderation, Reports, Creator Analytics and Post-LIVE Summary routes, plus a public Creator Profile route reusing PeerProfileScreen. PR #196 adds the leaderboard screen. Audio Room and Video Chat remain modes within Broadcast. | Core/operations, analytics and post-live summary implemented; leaderboard in review; 18-screen audit not accepted | Preserve LiveKit/media behaviour; complete remaining screens, backend capabilities, safety, states and device acceptance |
| LIVE backend | Current src/routes/liveStreams.js exposes discovery, broadcast lifecycle, join/leave, comments, reactions, guest requests/invites, participants, moderators, reports, follows, creator profile, replay and all-time leaderboard endpoints | Core endpoints exist; domain coverage incomplete | Map every endpoint to UI, authorization, RLS, rate limits and integration tests; scheduling/events, battles, gifts/wallet and time-series analytics still need real backend contracts |
| LIVE migrations | Two named migrations applied through successful guarded workflow run 44501209658 | Applied; do not rerun | Verify migration history only if needed; any correction is a new forward migration |
| Replay | One production READY row and matching private MP4 object verified; production playback endpoint returned HTTP 200 on 2026-11-19 | Backend playback access verified; video-player/access acceptance partial | Verify native/web decoding, expired link, account switch, unauthorized viewer denial and deletion |
| Full app inventory | ThemeContrast contract now audits 58 screen modules; current AppNavigator has 57 RootStack.Screen declarations, 53 unique route names and 16 LIVE route entries | Screen-module and route counts reconciled on the PR #196 branch | Reparse current RootStack registry after every screen addition; do not conflate route declarations with experiences |
| Parity scope | Retrieved parity gap analysis based on supplied original audit | Scope recorded; original source not re-opened in this pass | Retrieve original source before claiming any missing detail |
| Account isolation | PRs #146/#147 merged in a previous audit; two-account acceptance was outstanding then | Needs revalidation | Run two-account tests across chat/media/realtime/calls/LIVE |
| Backend deployment | Render production is LIVE on 1bfe0c29c18ae9832aaa020a208b59e69cef68de after leaderboard PR #152 | Leaderboard API deployed; authenticated smoke test pending | Verify route auth/privacy behaviour and record exact SHA; no migration was required |
| Production frontend | Vercel production is READY on 1b0bb2ab6495c781cde59408aaf08f9f3efaa92f at https://zannychat.vercel.app; includes PR #191/#193/#194/#195 | Deployed; real-device acceptance pending | Pull main locally, verify exact SHA and run production LIVE smoke tests; record five moderate npm advisories and Expo Google Services config warning |

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
| [#189](https://github.com/Zanny001/zannychat-frontend/pull/189) | Creator pre-flight, media permissions, native permission explanations and contracts | Merged as 99811698c3f33516f61b667c5bce25a95108efe1; quality workflows passed; production deployment still not confirmed |
| [#191](https://github.com/Zanny001/zannychat-frontend/pull/191) | Separate Creator Studio from public Creator Profile; preserve active-room return path | Merged as abb5bb4f7d169d45dd9b3adcdb15963b707ad33b; frontend quality/client/dependency/bundle checks passed |
| [#193](https://github.com/Zanny001/zannychat-frontend/pull/193) | LIVE guest queue, moderation and safety workspaces | Merged; runtime/two-account acceptance remains pending |
| [#194](https://github.com/Zanny001/zannychat-frontend/pull/194) | Authenticated Creator Analytics | Merged; aggregate-only metrics, trend data remains unavailable |
| [#195](https://github.com/Zanny001/zannychat-frontend/pull/195) | Creator post-broadcast summary | Merged; production/device acceptance remains pending |
| [#196](https://github.com/Zanny001/zannychat-frontend/pull/196) | LIVE Crown Leaderboard and account-scoped creator defaults | Open draft; frontend quality workflows running on latest head; Vercel preview rate-limited; do not merge until required checks/preview are resolved |

PRs #189, #191, #193, #194 and #195 are merged. PR #196 remains open/draft for the leaderboard and backend-backed creator defaults; backend PR #153 remains open/draft for the authenticated preferences API and migration. Do not revive closed branches wholesale or duplicate merged work. The user has paused further Chat implementation; keep all new execution focused on LIVE until explicitly redirected.

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
| LIVE-01 | 18-screen Crown Aurora LIVE experience | All 18 experiences responsive, accessible, state-complete and connected to actual services | Core, creator pre-flight, operations and aggregate analytics merged; post-live summary in review; detailed audit incomplete |
| LIVE-02 | Broadcast/Audio/Video room modes | Mode-specific permissions and correct media publishing | Creator pre-flight permission gating merged; physical-device permission/media acceptance pending |
| LIVE-03 | Five-guest queue/invites/approval/removal | Enforced five-guest limit and authorization tests | Guest Queue UI merged in PR #193; backend enforcement exists; approved/declined/expired history and device acceptance remain |
| LIVE-04 | Movable/resizable guest tiles | Bounded drag/resize on supported devices and reduced-motion fallback | Implemented; device QA needed |
| LIVE-05 | Chat/comments/reactions/moderation/reports | Two-account delivery, rate limits, hide/block/report and moderator permissions | Moderation/Reports workspaces merged in PR #193; production logs show no reaction-failure messages 15–19 Nov after 14 Nov RPC fixes; two-account acceptance pending |
| LIVE-06 | Battles/events/gifts/wallet/leaderboard/analytics | Real transactional models, abuse controls, clear Naira/unit conversion and audit trail | Aggregate analytics merged; all-time leaderboard API merged and screen in PR #196; battles, LIVE events/scheduling and gift/wallet ledger remain blocked pending backend/provider/legal design |
| LIVE-07 | Replay recording/library/player | Egress completion, DB row, private object, signed playback, unauthorized denial | Production READY artifact and playback endpoint HTTP 200 verified; native/web player decoding, expiry and unauthorized denial still require runtime acceptance |
| LIVE-08 | LIVE discovery/creator profile/notifications/settings | Real data, privacy and navigation | Creator Studio/Profile split merged in PR #191; Hub/stage profile entry points use privacy-aware PeerProfile; dedicated account-synced defaults screen wired to authenticated backend API on PR #196 branch; backend PR #153 adds durable Supabase persistence; both awaiting review/merge and guarded production migration |
| LIVE-09 | LIVE safety | Age/consent/blur/report/evidence and minor-safety controls | Blocked before random matching ships |


### LIVE screen inventory — 18 audited experiences

The 18 screens in the supplied Crown Aurora audit are nested within the wider application inventory. A dedicated route is not required for every transient panel, but each experience must have a complete, discoverable flow, accessible states and a clear owner. Current main has dedicated LIVE routes for Hub, Broadcast, Preflight, Creator Studio, Replay Library, Replay Player, Guest Queue, Moderation, Reports and Analytics; Creator Profile reuses PeerProfileScreen. PR #195 adds the post-broadcast summary as an additional journey. Audio Room and Video Chat remain Broadcast modes.

| # | Experience | Current source evidence | Required delivery |
|---:|---|---|---|
| 1 | LIVE Hub / Discover | Dedicated LiveHubScreen; discovery, follow, invite and start setup exist | Finish discover hierarchy, categories/region/search, pagination and all loading/empty/error/offline states |
| 2 | Creator Studio | Dedicated LiveCreatorStudioScreen and LiveCreatorStudio route; owner identity and impact summary are service-backed | Scheduling/policy gates, richer live controls, end-live confirmation and post-live review remain |
| 3 | Broadcast Room | Dedicated LiveStreamScreen with LiveKit stage, chat, reactions and controls | Complete connection/buffering/reconnect/permission/end states, safe areas, accessible overlays and low-power mode |
| 4 | Audio Room | audio_room experience mode in Broadcast Room | Complete audio-first stage, speaker seats, host controls, speaking indicators and audio-route behaviour |
| 5 | Video Chat Room | video_chat experience mode in Broadcast Room | Complete themed multi-guest layout, tile drag/resize/focus and participant lifecycle |
| 6 | Battles | No dedicated route or battle endpoint identified in current LIVE router | Design invite/accept/rules/round/result/rematch, safety and transactional scoring before UI claims functionality |
| 7 | Events and reminders | Global Events screen exists; LIVE-specific event journey is not evidenced | LIVE event discovery/detail, schedule, RSVP/reminder, creator management and time-zone handling |
| 8 | Replay Library | Dedicated LiveReplayLibraryScreen | Finish pagination/filters, thumbnails where available, processing/failure/expiry and owner actions |
| 9 | Replay Player | Dedicated LiveReplayScreen using authenticated playback endpoint | Verify real playback on web/native, expiry, account switch, access denial, retry and deletion |
| 10 | Creator Profile | LiveCreatorProfile route reuses privacy-aware PeerProfileScreen/LiveImpactCard; LIVE discovery and in-room entry points and follow/current-live action merged in PR #191 | Verify public/private profile visibility, follow/unfollow and return-to-active-stage on two accounts |
| 11 | Leaderboard / Crown Race | Backend GET /live/leaderboard merged in backend PR #152; frontend LiveLeaderboardScreen and LIVE Hub entry are in PR #196 | All-time impact ranking only; only public profiles are included; contacts-only/private and either-direction blocked creators are excluded. Weekly/monthly windows await time-series data |
| 12 | Gifts / Gift Tray | In-room presentation surface exists; no gift transaction endpoint identified in current LIVE router | Real catalogue, balance check, spend confirmation, idempotent transaction, animation, receipt and inventory |
| 13 | Wallet and Payouts | No dedicated LIVE wallet route or payout endpoint identified in current LIVE router | Balance ledger, top-up/provider billing, receipts, restore, KYC, bank selection, withdrawal and disputes |
| 14 | Creator Analytics | Dedicated LiveAnalyticsScreen merged in PR #194; authenticated creator profile summary covers impact, reactions, supporters, followers, broadcasts and replay status | Current API provides aggregate totals/latest 100 replay records only; date-range trends, watch-time attribution and export remain blocked pending backend analytics support |
| 15 | Moderation | Dedicated LiveModerationScreen merged in PR #193; supports guest mic/spotlight, guest demotion, stream-scoped viewer removal and moderator appointments | Runtime permission/two-account tests and evidence/audit history still required |
| 16 | Guest Queue | Dedicated LiveGuestQueueScreen merged in PR #193; pending requests, approve/decline, 5-seat capacity guard and empty/error/refresh states | Historical approved/declined/expired request states require a backend history response; verify two-account and device flows |
| 17 | Reports | Dedicated LiveReportsScreen merged in PR #193; open/reviewing/resolved/dismissed states and moderator authorization | Evidence attachment, assignment, appeal and durable audit-history flows remain |
| 18 | LIVE Settings | Dedicated LiveSettingsScreen on PR #196 branch; authenticated account-synced defaults for mode, audience, category and guest access via backend PR #153 and RLS-protected Supabase table | Complete creator/viewer preferences, privacy, notifications, data saver, blocked/muted users, language/region and account controls; cross-device sync needs a backend contract |

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



## 22. LIVE creator operations and analytics checkpoint — 2026-11-19

**This section supersedes the older “next immediate slice” notes in sections 20–21.** The active programme remains LIVE-only. Do not resume Chat implementation without an explicit user redirect.

### Merged LIVE delivery
- PR #191 merged Creator Studio/Profile separation. The owner dashboard is now LiveCreatorStudioScreen / LiveCreatorStudio; the public LiveCreatorProfile route reuses the privacy-aware PeerProfileScreen and LiveImpactCard.
- PR #194 merged dedicated LiveAnalyticsScreen, backed by the authenticated creator profile summary; it labels the latest-100 replay status limitation and avoids fabricated trends.
- PR #193 merged dedicated LiveGuestQueueScreen, LiveModerationScreen and LiveReportsScreen. Routes are discoverable from Creator Studio and native/web LIVE stage controls.
- The operations screens use existing authenticated stream-scoped backend routes; no new backend endpoint, migration, RLS, storage policy or provider was added.
- Guest approvals are disabled when five guest seats are occupied. Moving a guest off stage revokes publishing and returns them to the audience; removing a viewer blocks only that LIVE stream, not their ZannyChat account.
- Reports support open/reviewing/resolved/dismissed states. Moderators can review reports; creator-only participant management is not exposed to appointed moderators.
- PR #193 validation passed: 976 unit tests, frontend quality, Expo web/Android development exports, Android Kotlin compile, iOS prebuild/CallKit verification, release/contract/integrity audits, bundle-exposure audit and dependency audit.
- ThemeContrast now audits 56 screen modules. Every new operations and post-live control has an explicit accessibility role and label.

### Creator Analytics — PR #194 merged
- Dedicated LiveAnalyticsScreen reads only the authenticated /live/creators/me/profile summary.
- It presents impact score, reactions, unique supporters, current followers, total broadcasts, live-now count, total replays and latest-100 replay readiness/processing counts.
- It deliberately does not invent daily trends, watch time or exportable metrics because the current API does not provide those datasets.
- PR #194 passed 1,001 checks/tests across unit, call recovery, native call receiver, phase-6 release quality, frontend/client, native prebuild/compile, bundle exposure and dependency audit.

### Production and backend evidence
- Frontend main after PR #194: b8cffebb6736ddc63a834c22bcf78196d7a1a09d.
- Latest confirmed Vercel production deployment still serves 1060ca0e8eae49dab427420c7200d526a1fde710 (PR #185); the PR #191/#193/#194 LIVE merges are **not yet confirmed deployed**. PR #194 preview reached READY on code commit e4e7c5f; PR #195 preview is not yet confirmed. Do not claim production completion.
- The #191 branch had a READY preview on an earlier revision. The #193 branch's first preview failed on an intermediate JSX syntax error, which was corrected; no latest-head preview or production deploy is confirmed. Do not attribute that failure to a build quota.
- Backend Render remains deployed on 14860064a87c7637fc4f15dc6d75f4084b6f696a; production migrations remain applied through 20261118223000. No new LIVE migration is required for PRs #191/#193/#194.
- Production logs show the historical reaction RPC failures on 14 Nov (impact upsert alias and creator self-reaction); no matching reaction-failure logs were found from 15–19 Nov after the fixes. Two-account reaction acceptance is still required.
- Authenticated replay playback endpoint returned HTTP 200 on 19 Nov. This proves backend signed-playback access only; native/web video decoding, expired-link handling and unauthorized denial remain acceptance gates.

### Remaining 18-screen gaps and backend dependencies
- Battles, LIVE Events/scheduling/reminders and Leaderboard have no verified LIVE backend routes yet.
- Gifts/Wallet/Payouts must not show transactional success until a real idempotent ledger, balance enforcement, payment provider, receipts/refunds, fraud controls, KYC and legal/provider approval exist.
- Analytics currently exposes aggregate creator totals only; date-range time series, watch-time attribution and export need backend data contracts.
- Guest Queue currently lists pending requests; historical approved/declined/expired states need a backend history response.
- Reports still need evidence attachment, assignment, appeal and durable audit history. Safety Centre, age/region eligibility, creator policy acceptance and minor-safety gates remain incomplete.
- LIVE Settings now has a dedicated screen and backend-backed account-synced creator defaults on PR #196/#153; broader LIVE-specific viewer/privacy/notification/data-saver controls remain open; global Privacy & Safety, Notifications and Sessions routes are linked.
- Audio Room and Video Chat Room remain modes within Broadcast, not separate navigation routes; their device/audio-route acceptance remains pending.

### Next execution order
1. Finish and merge PR #195 Post-LIVE Summary after all checks pass.
2. Ask the user to pull frontend main locally; then perform Android 10/11 and modern-device LIVE acceptance with two accounts, including guest approval/removal, reports/moderator permissions, reaction delivery, replay playback and account switching.
3. Verify Vercel production deployment against the exact merged main SHA before claiming deployment.
4. Design the missing backend contracts in dependency order: LIVE settings and analytics time series; scheduled events/reminders; leaderboard; battle lifecycle; then wallet/gift ledger and payment-provider gates.
5. Keep Chat follow-ups pending and untouched throughout the LIVE programme.


## 23. Post-broadcast summary and creator analytics checkpoint — 2026-11-19

### Merged
- PR #194 merged Creator Analytics, adding a dedicated screen that uses only the authenticated creator profile summary. It reports service-backed aggregates and explicitly explains the absence of daily trends, watch-time attribution and exports.
- Frontend main after PR #194: b8cffebb6736ddc63a834c22bcf78196d7a1a09d.
- Current AppNavigator inventory on the PR #195 branch: 55 RootStack.Screen declarations, 51 unique route names and 14 LIVE route entries; ThemeContrast audits 56 screen modules.
- Vercel preview for PR #194 reached READY on code commit e4e7c5f4d0853b4ef5fc5caf22a9e35caccb9865. The final PR head added documentation only. Production still serves 1060ca0e8eae49dab427420c7200d526a1fde710; no LIVE merge is yet confirmed in production.

### PR #195 — Post-LIVE Summary
- Adds a creator-only summary after a successful end-LIVE action.
- Confirms creator identity before and after fetching the creator profile and replay status, preventing a stale account from seeing the prior creator's summary.
- Uses the existing creator profile summary and stream replay list to obtain ended-at and replay status; local time is only a fallback if the summary endpoint is unavailable.
- Shows session duration, ended time and replay status, with links to replay library, Creator Studio and LIVE Hub.
- Does not invent viewer reach, watch time, earnings or engagement totals.
- No backend endpoint or migration is added.

### Remaining acceptance
- PR #195 must pass frontend/client/platform/bundle checks before merge.
- Native/web video decoding and replay expiry/unauthorized-denial tests remain open.
- Pull the exact merged frontend main locally before device acceptance or production deployment.
- Chat remains paused; PR #185 was already merged before this LIVE continuation and no additional Chat work has been performed.


## 24. LIVE leaderboard and production deployment checkpoint — 2026-11-19

**This section supersedes earlier production and next-step notes in sections 22–23.**

### Production frontend
- Frontend main after PR #195: 1b0bb2ab6495c781cde59408aaf08f9f3efaa92f.
- Vercel production deployment is READY and aliases include https://zannychat.vercel.app.
- Deployment logs show the Expo web export completed. The build also reported five moderate npm advisories and a non-fatal android.googleServicesFile Expo config warning; track both rather than treating the deploy as a full acceptance pass.
- No manual deploy was run; Vercel auto-deployed after merge. Device acceptance is still pending.

### LIVE leaderboard — backend PR #152 merged; frontend PR #196 in progress
- Backend main and Render production are LIVE on commit 1bfe0c29c18ae9832aaa020a208b59e69cef68de after PR #152; authenticated smoke testing is still required.
- GET /live/leaderboard supports all-time ranking only, backed by live_creator_impact aggregates.
- It returns only public profile name/avatar colour and aggregate impact/reaction/supporter metrics; private/contact-only profiles and either-direction blocked creators are excluded.
- Ranking is deterministic and capped at 50 returned entries. Weekly/monthly windows are rejected until time-series source data exists.
- Frontend PR #196 adds LiveLeaderboardScreen, a LIVE Hub entry point, account-switch guards, following-state lookup and privacy-aware creator-profile navigation.

### Current inventory on the PR #196 branch
- 57 audited screen modules.
- 56 RootStack.Screen declarations, 52 unique route names and 15 LIVE route entries (including nested duplicate names).
- The 18-screen audit remains incomplete: battles, scheduled events/reminders, gifts/wallet, full LIVE settings, safety/age eligibility, report evidence/appeals and analytics time series remain open.

### Next execution order
1. Complete PR #196 and deploy backend main commit 1bfe0c29 before accepting the frontend leaderboard.
2. Add the real scheduled LIVE Events flow, including reminders and creator cancellation/rescheduling.
3. Design and implement Battle lifecycle and anti-manipulation rules.
4. Complete persisted LIVE settings and guest-request history.
5. Keep gifts/wallet/payouts blocked until a real idempotent ledger, payment provider, fraud/refund/KYC/legal requirements are available; do not simulate a money balance.
6. Ask the user to pull exact frontend main locally and run two-account Android 10/11 and modern-device acceptance; verify replay playback and moderation permissions.
7. Continue leaving Chat follow-ups untouched.


## 25. LIVE account-synced creator defaults — 2026-11-19

### Implementation checkpoint
- Frontend PR #196: https://github.com/Zanny001/zannychat-frontend/pull/196. Backend PR #153: https://github.com/Zanny001/zannychat-backend/pull/153.
- Backend adds authenticated GET/PUT /live/creators/me/preferences, strict server-side allowlists, account identity from verified req.user.id, and an RLS-enabled table with direct client grants revoked.
- Creator defaults are applied only to the next LIVE setup; active streams are not mutated. Private LIVE still requires explicit invitee selection at setup.
- The settings screen clearly reports that a successful save is stored in the ZannyChat account, not merely on the device. Hub fallback wording now accurately identifies the preferences service.
- The standalone production migration workflow is manual, requires an explicit boolean confirmation, and refuses to apply unless exactly migration 20261119180000 is pending. It has not been dispatched; the migration has not been applied to production.
- Backend quality and advanced-calling checks passed on current backend PR head 077edcd927e48abe9799e4eb21b073350a783ee7.
- Frontend quality passed on earlier PR #196 head d0f86e9d; a copy-accuracy fix and regression assertion are now on the branch and current-head CI is running. Do not claim final frontend checks until those runs pass.
- No PR has been merged as part of this checkpoint. Authenticated two-account/device acceptance and production migration remain pending.

### Verified LIVE API inventory and next build targets
- Existing backend routes cover discovery, follows, stream lifecycle, admission, invites, guest requests, comments, reactions, stage moderation, reports, creator impact, leaderboard and replay playback/deletion.
- No dedicated LIVE scheduling/events or battle lifecycle routes/tables were found in the current backend inventory. No LiveEventsScreen or LiveBattleScreen exists in the current frontend inventory.
- Gifts/wallet remain blocked until ledger, server-authoritative balance, idempotency, receipts/refunds, fraud controls and any required payment/KYC/legal/provider approvals are implemented. No simulated balances or purchases.
- Keep Chat work paused and do not modify PR #185 or any Chat surfaces.


## 26. LIVE preference payload integrity correction — 2026-11-19

- Review found that GET/PUT responses include server-owned `updatedAt`, while the backend correctly rejects unknown PUT fields. Sending the loaded object unchanged would have caused a 400 when saving an existing preference.
- Frontend service now constructs an explicit four-field writable payload (`experienceMode`, `visibility`, `category`, `allowGuests`) and excludes `updatedAt`.
- Frontend contract test asserts the metadata is not sent; backend contract test asserts unknown keys are rejected and `updated_at` is server-generated.
- Latest frontend and backend CI runs for these regression changes are pending. Treat this as an important pre-merge correction, not production-verified behavior.


## 27. LIVE creator preferences backend merged — 2026-11-19

- Backend PR #153 merged to backend main as merge commit 88413b0e92fa5403016973f089cd49d583a7d1ee. Backend quality and advanced-calling checks passed on the final backend PR head before merge.
- Production Supabase was queried after merge: latest applied migration is 20261118223000; migration 20261119180000 is not applied and `public.live_creator_preferences` does not yet exist. No production schema changes were made during this check.
- The production security advisor currently reports RLS-enabled/no-policy informational findings for existing service-role-only LIVE tables. The new preferences migration is designed the same way: RLS enabled, direct PUBLIC/anon/authenticated privileges revoked, service_role granted.
- Redundant duplicate apply workflow was removed. The backend now retains one manually confirmed exact-migration apply workflow plus one separate preview-only workflow. Both check that the only pending migration is 20261119180000 before any apply; the apply workflow also dry-runs and rechecks before execution.
- Supabase's migration list and schema were independently inspected. The guarded workflow still needs to be dispatched from GitHub Actions; it has not run, and the migration remains unapplied.
- Frontend PR #196 is still open. Latest premium/LIVE quality passed on commit 7bcebf798134d69ed90515d57ba49647e91c1a4f; the current advanced client workflow is still running for the PR's documentation-only successor commit c249e32979978700b579e79eb35c3ed257a4a856. Dependency and bundle checks are green on the current run; client quality remains pending.
- Do not merge frontend PR #196 or claim LIVE Settings operational until the migration is applied and backend Render deployment plus authenticated API smoke checks are verified.


## 28. Full-product execution and production reconciliation — 2026-11-20

This section supersedes earlier status statements in this register where current GitHub or read-only production evidence differs. Historical entries are retained as dated history, not current state.

### Governing documents and scope
- The complete phase sequence is now versioned in [Master Execution Phases](./MASTER_EXECUTION_PHASES_20261120.md), merged in frontend PR #213 as `a43a362e9bde55a71631f03c2852a8a3035c5aa1`.
- The read-only current architecture/security inventory is in [Architecture and Security Snapshot](./ARCHITECTURE_SECURITY_SNAPSHOT_20261120.md).
- The user's direction resumes the wider product programme; the earlier LIVE-only pause is no longer the governing priority. Preserve the dependency order and keep the current LIVE incident visible as Phase 0.
- No production migration, data mutation, Auth setting change, Storage change or infrastructure change was performed during this reconciliation.

### Current merged code and release evidence
| Change | Current evidence | Status |
|---|---|---|
| LIVE creator preferences backend | Backend PR #153 merged as `88413b0e92fa5403016973f089cd49d583a7d1ee` | Merged |
| LIVE leaderboard/settings frontend | Frontend PR #196 merged as `6a58b158f9802ee11d58a783b3f440187436f28c` | Merged; production API/migration acceptance remains separate |
| LIVE reaction authorization/error mapping | Backend PR #167 merged as `80099bf82e3ce59c8958cf82db3f38c837c340ae` | Merged; two-account runtime acceptance remains separate |
| Web LIVE stage ReferenceError fix | Frontend PR #212 merged as `1cc99815d1ef82e7b97fcc3d7987d3e095377377` | Merged; Vercel deployment reported READY; real creator/viewer browser and media acceptance remains pending |
| Master execution programme | Frontend PR #213 merged as `a43a362e9bde55a71631f03c2852a8a3035c5aa1` | Merged; documentation only |

The Vercel check for documentation PR #213 reported `upgradeToPro=build-rate-limit`. This is a team build quota failure, not an application test result. Do not upgrade the plan under the ₦0 constraint solely to clear it.

### Current Supabase read-only reconciliation — 2026-11-20
- Migration inventory returned 110 applied rows; latest row observed: `20261119220130 / live_stream_hard_timeout`.
- The LIVE creator-preferences migration is applied. History reports `20261119184056 / live_creator_preferences_20261119180000`; the source file is `20261119180000_live_creator_preferences.sql`. The table exists, RLS is enabled, direct anon/authenticated SELECT is denied, and service_role SELECT is granted. This supersedes the stale statements in sections 1 and 27 that said PR #153 remained open or its migration was unapplied. Reconcile the recorded version/name against the guarded workflow log before future migration work; do not repair or replay history from this observation alone.
- 69 public tables were observed; all have RLS enabled. 42 have no policies but a direct effective-privilege query found no anon/authenticated SELECT/INSERT/UPDATE/DELETE on those tables. Preserve the backend/service-role-only access model.
- 76 public functions are SECURITY DEFINER; 28 are executable by authenticated, none of those 28 by anon, and all have configured search_path. Initial body triage found identity binding or delegation for all 28; complete caller/argument/ownership review remains open.
- Storage buckets observed: live-replays, chat-media, private-avatars and status-media are private; avatars is public. Keep public/private avatar paths distinct.
- Security advisor: leaked-password protection disabled (plan-gated on current Free plan); no setting change or paid upgrade authorized.
- Performance advisor: two unindexed foreign keys (`live_event_invites.invited_by`, `live_event_reminder_deliveries.user_id`) and 66 unused-index notices. No index was added or removed; require query-plan/workload evidence first.
- Health advisor returned no findings at the snapshot time.

### Current source inventory correction
- Current `AppNavigator.js` parse: 56 unique screen modules imported, 57 stack declarations, 53 unique stack route names and six primary tabs.
- The existing 48-experience matrix remains a product-journey inventory, not a source-module count. It must be reconciled against current routes/modules without silently deleting scope or double-counting shared screens.
- Backend `src/index.js` currently mounts 16 route modules and starts nine recurring worker loops. Update older architecture summaries that say seven workers.

### Immediate next actions
1. Phase 0: confirm the existing Gas broadcast opens for creator and viewer after PR #212 deployment; verify remote audio/video and interactions without ending or duplicating the broadcast.
2. Phase 1: complete route-to-service, backend route-to-worker, table/RPC/trigger/storage ownership, delegated function and migration-provenance maps.
3. Phase 2: reconcile PR #85's unique changes against current main and review the current 48-experience product matrix against the 56-module/53-route source inventory.
4. Phase 3: complete two-account privacy/block/status acceptance (backend issue #19; frontend issue #16).
5. Phase 4 onward: resume the full-product programme in the dependency order in the Master Execution Phases document.

**Acceptance remains evidence-based:** merged code, green CI, applied migrations, deployment READY, browser acceptance, two-account acceptance and physical-device acceptance are separate facts. Keep each separately recorded.

## 29. Phase 1 worker and migration-provenance review — 2026-11-20

This section supersedes earlier worker/migration statements where the source and read-only production evidence below is more specific.

### New verified implementation and design checkpoints
| Change | Evidence | Status |
|---|---|---|
| Premium LIVE shared screen system | Frontend PR #203 merged; shared Crown Aurora header/hierarchy applied across LIVE destinations | Merged; visual/device acceptance remains separate |
| Premium LIVE room controls | Frontend PR #205 merged; role-aware header and labelled controls | Merged; physical-device acceptance remains separate |
| Premium LIVE Events cards/layout | Frontend PRs #206 and #207 merged | Merged; runtime and responsive acceptance remain separate |
| Premium LIVE Creator Studio tools launcher | Frontend PR #208 merged | Merged; destination workflows remain separately tested |
| Chat Appearance persistence feedback | Frontend PR #215 merged as `b84f117750672ba1190fb34440e06b8d7fc99881` | Merged; unit/contract, Android compile, iOS prebuild, web/Android export, release, dependency and bundle checks passed; device-level storage-failure simulation remains open |

PR #204 was closed unmerged and superseded by PR #205; do not revive it. PR #215's Vercel status reported the known team `upgradeToPro=build-rate-limit` failure. The GitHub Actions application-quality, native compile/prebuild/export, dependency and bundle checks passed. This is not a source failure and does not justify a paid upgrade under the ₦0 constraint.

### Worker lifecycle review
The companion [Architecture and Security Snapshot](./ARCHITECTURE_SECURITY_SNAPSHOT_20261120.md), sections 7–8, records source-level findings for all nine recurring workers. Key open risks:
- Account-storage cleanup uses only a process-local overlap guard and no visible database claim lease; verify actual deployment topology and job semantics before considering any change.
- Group-call media teardown uses a bounded ended-room scan and conditional completion marker but no visible DB claim lease.
- Ended LIVE-room deletion and replay recovery use periodic scans without a durable distributed lease visible in the inspected worker code.
- Call invitation/end notification, media-participant cleanup, LIVE event reminders and LIVE timeout warnings use database RPC claim/cleanup paths; inspect the full SQL bodies and retry/lease-expiry semantics before declaring those paths fully audited.
- Source logs do not establish worker liveness, last-success freshness or alert delivery in production.

No worker was manually invoked and no production job, media room, storage object or row was modified.

### Migration provenance — corrected
- Production migration history lists `20261119184056 / live_creator_preferences_20261119180000`; the source filename is `20261119180000_live_creator_preferences.sql`.
- Historical workflow run `44501209658` applied only `20261118221000_live_experience_modes.sql` and `20261118223000_block_removed_live_participants.sql`; it is not evidence for creator-preferences migration provenance.
- The current `.github/workflows/live-creator-preferences-migration.yml` expects `20261119180000` as the sole pending migration. With the observed production history, it should refuse to apply.
- The exact mechanism/source checksum behind history version `20261119184056` remains unresolved. Do not dispatch the workflow, replay SQL, edit migration history or create a timestamp-normalizing migration until the original apply event is reconciled.

### Current next action
1. Continue Phase 1 read-only review of claim/cleanup RPC definitions, trigger ownership, grants and delegated SECURITY DEFINER helper chains.
2. Confirm the production worker instance topology and collect worker last-success/error evidence without manually running destructive cleanup.
3. Complete the frontend experience-to-route/service matrix and the backend route-to-service/provider map.
4. Keep Phase 0 Gas creator/viewer browser acceptance open until the user confirms the existing broadcast works after PR #212 deployment.
5. Continue Phase 2 across the entire app; LIVE PRs #203 and #205–#208 improve the LIVE design language but do not constitute full-app visual acceptance.

No production database, Auth, Storage, deployment or infrastructure mutation was performed by this review.

### Production worker-RPC grant verification
A read-only production query inspected the definitions and effective grants of the call-notification, media-cleanup, LIVE-event reminder and LIVE-timeout claim/cleanup RPCs. All inspected functions are SECURITY DEFINER with configured search paths and are executable by `service_role` only—not by `anon` or `authenticated`. Call invitation/end and event-reminder claims use `FOR UPDATE SKIP LOCKED`; stale claim recovery windows observed were five minutes, two minutes and ten minutes respectively. LIVE timeout warning claim/release is an atomic stream-row update. Media/call cleanup RPCs perform guarded state transitions and bounded cleanup. See the companion snapshot for exact scope and limitations.

The production `account_storage_cleanup_jobs` table is service-role-only and its allowed states are `held` and `pending`; no persistent processing lease exists. The worker's in-process guard therefore does not coordinate multiple backend processes. Keep this as a conditional hardening candidate—not a confirmed production incident—until actual deployment topology and job lifecycle are verified. No schema or job change was made.

## 30. Phase 1 security-function review and premium UI progress — 2026-11-20

### Security-function review update
The four authenticated-executable SECURITY DEFINER functions without direct `auth.uid()` checks have now had their delegated chains reviewed. Both poll compatibility overloads delegate to identity- and conversation-membership-checked implementations. Both visible-avatar/cover path helpers delegate to `can_view_profile_avatar`, which checks authentication, bidirectional blocks, photo/profile visibility and shared conversation. No bypass was found in these delegated paths. The other 24 functions still require complete per-function authorization review and caller-context tests.

A product/privacy semantics item remains open: `get_conversation_profile_directory` returns basic identity fields for existing conversation peers even if profile visibility is set to “Nobody”; avatars and online presence remain separately gated. This may be intentional for message attribution, but must be reconciled with the user's visible privacy wording before privacy can be marked complete. No production changes were made.

### Premium interface implementation checkpoints
| PR | Scope | Status |
|---|---|---|
| #217 | Theme preference writes/reads now report storage failures, retain current-session selection, guard late initial reads per setting, and expose an accessible dismissible warning in Settings | Merged: `a4383eadf5b249c91ca6eceadb7fbed0fb47966d`; unit/contract, native compile/prebuild, web/Android export, release/integrity, dependency and bundle checks passed. Device storage-failure simulation remains open |
| #218 | Centered 760px content columns for Forward Message, Saved, Drafts, Pinned, Chat Folders, Shared Media and Chat Appearance | Merged: `e276bf6775aedc0a8457086aee3cb6a9e080c2d1`; frontend quality and advanced calling workflows passed |
| #219 | Centered 760px inbox, New Chat directory, Chat timeline/composer and search panel | Merged: `6905379a3d4f45d43362f26f1ed27856d4678b1d`; frontend quality and advanced calling workflows passed |
| #220 | Shared 480px form measure for onboarding, login, signup, recovery, verification, reset and auth-required screens | Open; initial unit run caught a test-format assertion mismatch, now corrected; clean rerun pending |
| #221 | Centered profile, peer profile, edit profile, privacy/security, notifications, help, storage, export, sessions and contact-discovery surfaces; narrower QR contact surface | Open; web/Android preview exports passed; unit/native/bundle checks running |

These changes preserve full-bleed backgrounds and fluid mobile widths; they are source changes, not proof of production deployment or real-device visual acceptance. The Vercel free-team build-rate limit remains the only known blocker to automatic production builds; do not upgrade to a paid plan under the ₦0 constraint.

### Next interface sequence
1. Finish and merge #220 and #221 only after all required application/native checks pass; address any test failures rather than bypassing them.
2. Continue with Status Updates and Channels, then Profile/Settings acceptance, then Calls, then the complete LIVE destination set, followed by remaining account/auth and utility screens.
3. Keep each screen's data, loading, empty, error, offline, permission-denied and accessibility states functional—not just its default visual state.
4. Keep the existing Gas broadcast browser/device acceptance open until the user confirms creator and viewer can both enter the existing stream after PR #212 deployment.

## 31. Calling architecture: cross-mode active-call invariant gap

A read-only audit of group-call RPC bodies, call-session trigger functions, indexes and current production rows found a latent cross-mode concurrency gap. Direct-call creation prevents two active direct `call_sessions` for the same user, but it does not check active group-call membership. Conversely, `join_group_call_room` and `join_direct_call_room` do not check whether the user is already in another active direct or group call. `create_group_call_room` also does not reject a host already joined elsewhere. There is no cross-room active-participant unique index/constraint.

The read-only production snapshot found no current duplicates or direct/group overlaps, so this is not a confirmed active incident. It is a correctness gap that can allow a user to be joined to two simultaneous calls, causing audio/video routing confusion and unreliable leave/end behavior.

**Proposed fix:** one shared per-user transaction advisory-lock convention, used in the direct-call insert trigger and the group-call create/join/promotion RPCs, followed by cross-mode active-call checks. Add concurrency integration tests and stable HTTP 409 mapping. The full design is in section 10 of the Architecture and Security Snapshot.

**Migration gate:** no migration file or production SQL was created/applied. The local Supabase CLI was unavailable and its install attempt timed out; per the migration-generation workflow, do not invent a timestamp or apply DDL through the MCP tool. Generate the migration with the pinned project CLI, review the SQL/tests, and obtain the user's explicit approval before production application.

## 32. Full-product interface and LIVE checkpoint — 2026-11-20

### Merged premium interface work
| PR | Interface scope | Merge SHA | Automated acceptance |
|---|---|---|---|
| #218 | Forward Message, Saved Messages, Drafts, Pinned Messages, Chat Folders, Shared Media, Chat Appearance centered collection columns | `e276bf6775aedc0a8457086aee3cb6a9e080c2d1` | Frontend quality and advanced calling checks passed |
| #219 | Chats inbox, New Chat directory, Chat timeline/composer/search centered column | `6905379a3d4f45d43362f26f1ed27856d4678b1d` | Frontend quality and advanced calling checks passed |
| #220 | Onboarding, Login, Signup, Recovery, Email Verification, Reset and Auth Required shared 480px form measure | `c30099c4fe0d4c172ae8012747b29c8c4a506461` | Frontend quality, Android compile, iOS prebuild and web/Android exports passed |
| #221 | Profile, Peer Profile, Edit Profile, Privacy/Security, Notifications, Help, Data Storage, Export, Sessions, Contact Discovery and QR Contact content measures | `878644571df2241eaf2f83d0a811439dc3609d58` | Frontend quality, Android compile, iOS prebuild and web/Android exports passed |
| #224 | Status Updates and Channels centered content | `d8acae31ada9110b2daea5304f69fc3ac0af7442` | Frontend quality and advanced calling checks passed |
| #225 | Direct/incoming/outgoing call identity/control sizing, call history, group-call media-stage measure | `16dace1e65f645193f46c88f74fa02dcf6954afb` | Frontend quality and advanced calling checks passed after updating a brittle existing contract assertion |
| #226 | Create Group, Polls, Events, Group Management, Join Group and Scheduled Messages content measures | `127e2bbd372cee059b701f7aa0d160101b43b1e6` | Frontend quality and advanced calling checks passed |

PR #215 separately corrected Chat Appearance save feedback; PR #217 corrected ThemeContext preference persistence feedback and initial-load races. Earlier LIVE-specific design slices #203 and #205–#208 remain merged. The 56-module navigation inventory remains the scope baseline; these PRs do not by themselves certify every screen state or complete the visual acceptance pass.

### Deployment and runtime limits
- The frontend changes above are merged into GitHub main. They are **not confirmed deployed**: the Vercel team continues to report the free-team `upgradeToPro=build-rate-limit` failure. Do not purchase an upgrade or switch to a paid plan under the ₦0 constraint.
- The existing PR #212 deployment was previously reported READY on the production domain, but the user has not confirmed the current Gas creator and viewer experience.
- A read-only production query now shows the Gas stream row as `ended`, with `started_at=2026-11-20 08:46:34 UTC` and `ended_at=2026-11-20 11:09:07 UTC`. The `live_streams` table has no end-reason field, so the cause is unknown. No stream was started, stopped or modified by this audit.

### Remaining Phase 2/3 interface sequence
1. Verify all screen states and layout behavior on phone, tablet and web; current PRs establish content measures but are not screenshot/device acceptance.
2. Continue full LIVE stage and creator workflow acceptance: creator recovery, viewer entry, guest lifecycle, moderation, comments/reactions, replay availability, end/leave semantics and reconnect.
3. Complete the remaining account/auth/settings and utility screens in the 56-module inventory, including error, empty, loading, offline and permission-denied states.
4. Keep the Crown Aurora theme coherent across all destinations, with restrained effects and accessible contrast; no screen may use fake data or inert controls.

### Blocking backend correctness item
The cross-mode single-active-call invariant gap is documented in section 10 of the Architecture and Security Snapshot and PR #229. No duplicate rows were found at audit time, but the atomic fix needs a migration. The migration file has not been generated because the pinned Supabase CLI was unavailable in this execution environment. Do not fabricate a timestamp or apply production DDL without the user's explicit approval.

## 33. Privacy enforcement audit: newly verified migration-gated gaps

A deeper read-only audit verified that read receipts, online/last-seen visibility, status audiences, direct-call recipient preferences, profile visibility guards and status expiry immutability have server/database enforcement. Column-level grants also prevent clients from changing conversation membership identity/admin fields or message sender/conversation/delete identity.

Three additional gaps are now documented in section 13 of the Architecture and Security Snapshot:
1. `accept_group_invite` does not enforce `group_invite_permission` or the inviter block check, so forwarded invite links can bypass `Nobody` / `Contacts` preferences.
2. Group-call invite/create/promotion RPCs do not enforce `call_permission`; one promotion path checks `profile_visibility` instead. Direct calls do enforce `call_permission`, making behavior inconsistent.
3. Owner updates to `profile_details.avatar_path/cover_path` and `profiles.avatar_url` are not guarded by owner-path/object integrity checks. Current production values are clean (three owner-matching public URLs, one owner-matching private avatar object, no cover paths), but a malicious direct table write can spoof another user's image or cause arbitrary external image fetches.

These join the cross-mode active-call invariant gap in section 31. The remediation spans SECURITY DEFINER functions, trigger functions and table constraints and must be one reviewed migration set with SQL integration tests. No production changes were made. The explicit migration-approval gate remains in force.

## 34. Worker reliability audit

All nine recurring background loops and their principal SQL claim/cleanup functions have now been reviewed. Call invitation, call-ended and LIVE event reminder queues use `FOR UPDATE SKIP LOCKED` with bounded stale leases/retries; LIVE timeout warnings use a conditional atomic claim plus release-on-failure; stale participant and call-session cleanup use idempotent set-based updates; replay quota reserve/finalize is serialized by a singleton row and replay ID.

Three scaling hardening items remain:
1. Account-storage cleanup uses only a process-local running guard, not a database claim/lease; duplicate workers can process the same job if multiple backend instances run.
2. LIVE replay-ready push is sent before `notification_sent_at` is persisted; webhook and recovery worker can race and send duplicate ready notifications. Add an atomic notification claim/lease.
3. Group-call and ended-LIVE room cleanup rely on idempotent LiveKit 404 behavior; ended LIVE rooms are rechecked repeatedly because no deletion marker is persisted. This is safe but noisy/inefficient.

The nine loops are started only when `src/index.js` is the process entrypoint. Production worker liveness, last-success freshness, queue depth, stale lease count and alerts remain unverified; Render was not inspected per the user's instruction. No worker was invoked and no production queue or resource was changed.


## 35. Reconciliation of privacy and replay findings against merged backend fixes — 2026-11-20

This section supersedes the affected statements in sections 33–34, which predate backend PRs #169–#172.

### Implemented in backend main
- **PR #169 merged:** group-link acceptance now checks the invitee's `group_invite_permission`, shared-conversation relationship and bidirectional blocks before the service-role membership RPC. Regression tests cover `everyone` / `contacts` / `nobody`, blocks and contact relationship behavior.
- **PR #171 merged:** unknown/invalid group-invite preference values fail closed rather than defaulting to allow.
- **PR #170 merged:** initial group-call invitations, additional group-call invitations and direct-call-to-group upgrades now check `call_permission`, shared conversations and bidirectional blocks. Invalid preference values fail closed.
- **PR #172 merged:** concurrent replay finalizers in one backend process now use an in-flight guard and re-read `notification_sent_at` before sending; removed replay rows are not notified.

### Remaining qualification
The group invite and group-call preference checks are enforced in trusted backend routes before their service-role RPCs, but are not yet atomic with the database membership/invitation write. A narrow check-to-write race remains if a preference or block changes between the read and RPC. Replay notification deduplication is process-local, not a distributed database lease; two backend instances can still race. These are follow-up hardening items, not reasons to describe the already-merged route fixes as absent.

### Still open
- Profile avatar/cover owner-path and object integrity enforcement remains migration-gated (snapshot section 13C).
- Cross-mode active-call uniqueness remains migration-gated (snapshot section 10 / delivery register section 31).
- Durable distributed claim/lease for account-storage cleanup and replay-ready notifications remains a pre-horizontal-scaling requirement (snapshot section 14).
- Production worker liveness, queue depth, last-success and alert delivery remain unverified.
- Gas LIVE creator/viewer acceptance remains unconfirmed by the user.

No production migration, SQL, data, storage, auth, infrastructure or cleanup job was changed during this reconciliation.


## 36. P0 reliability execution update — 2026-11-22 07:12 UTC

### LIVE teardown polling
- PR #298 was closed unmerged as superseded; do not treat it as a merged delivery.
- Fresh-main PR #300 delivered the native/web ended-state guards for comments, guest-status and guest-request polling, ignored in-flight responses after teardown, and prevented queued comment refreshes from restarting after end.
- PR #300 merged successfully as `748c1a3d097437ae0d7a9743797d7ca9194548c2`. Frontend-quality and advanced-calling client workflows both passed on head `20e7dcfd1f548bd75b414ac9eb51139b94596db6`; Vercel preview `https://zannychat-j3zx29g40-zanny-chat.vercel.app` reached READY.
- Production deployment for main commit `748c1a3d097437ae0d7a9743797d7ca9194548c2` was observed BUILDING at 07:12 UTC. Recheck exact deployment and production alias before marking deployed.
- Creator/viewer device acceptance remains open: verify the guest-request poll stops after end/leave and normal guest requests still work while LIVE is active.

### Browser LiveKit remote audio
- PR #297 was closed unmerged as superseded because its branch had diverged from current main after PR #300.
- PR #301 reapplies the same reviewed two-file remote-audio recovery change on current main at `f65870d432791ae0b945f466e02e4b9ecce6e0ec`; fresh frontend/client CI was running at 07:12 UTC and preview must be rechecked.
- Keep the feature out of production until two participants confirm audible two-way browser/device playback, including autoplay rejection followed by the user-gesture audio-unlock recovery.

### P0 acceptance still open
- Android production voice-note playback, speed and seek test.
- Two-participant browser/device call audio test on PR #301 preview.
- LIVE creator/viewer/guest test on the deployed #300 release, including active guest-request polling, end/leave semantics and no post-teardown polling.

No production database, Auth, Storage, backend configuration, or infrastructure mutation was made by these frontend changes.


## 37. Browser two-way audio acceptance and merge — 2026-11-22 07:19 UTC

- User completed a real audio-call test and explicitly confirmed that both participants could hear each other clearly in both directions.
- PR #301 merged into main as `b4b9eee9eecc98e511d4b939376ce778f782465d`. It reapplies browser LiveKit remote audio attachment, audible autoplay configuration, autoplay-rejection recovery through the existing audio-unlock action, track-SID cleanup, and regression coverage on the current main baseline.
- The exact PR head had passing advanced-calling client checks, premium/LIVE quality checks, dependency audit and bundle-exposure audit; its Vercel preview was READY.
- The new production deployment for merge SHA `b4b9eee9eecc98e511d4b939376ce778f782465d` was BUILDING at this checkpoint. Verify READY state and production alias before calling it deployed.
- Remaining calling nuance: the user confirmed clear two-way audio; a separate forced browser autoplay-denied then gesture-unlock scenario has not been explicitly confirmed by the user.
- Voice-note playback/speed/seek acceptance and LIVE creator/viewer/guest lifecycle acceptance remain open.
