# ZannyChat Master Delivery Register

**Status:** Baseline reconciliation in progress  
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
| LIVE core UX | PR #170 and PR #176 reported merged; themed modes, guest layout and controls | Merged; production acceptance reported by user | Preserve functionality; only reopen defects supported by new evidence |
| LIVE backend RPC safety | Backend PR #151 reported merged and Render deploy live | Needs revalidation | Verify current backend main and Render deployed SHA |
| LIVE migrations | Two named migrations applied through successful guarded workflow run 44501209658 | Applied; do not rerun | Verify migration history only if needed; any correction is a new forward migration |
| Replay | Pipeline source exists; prior production evidence had zero replay rows/objects | Needs production revalidation | Check current recording, row/object creation and authorized playback independently |
| Full app inventory | 46 registered modules / 48 experiences recorded in later audit | Inventory baseline | Reparse current route registry and reconcile additions/removals |
| Parity scope | Retrieved parity gap analysis based on supplied original audit | Scope recorded; original source not re-opened in this pass | Retrieve original source before claiming any missing detail |
| Account isolation | PRs #146/#147 merged in a previous audit; two-account acceptance was outstanding then | Needs revalidation | Run two-account tests across chat/media/realtime/calls/LIVE |
| Backend deployment | Historical audit reported main/deploy SHA divergence; PR #151 later deployed | Needs revalidation | Compare current main SHA to Render deploy SHA |
| Production frontend | Previous conversation reported Vercel READY at commit 55fb010 | Needs revalidation | Verify current production deployment and exact SHA |

## 2. Open PR reconciliation — do not duplicate

The following open frontend PRs were returned by GitHub on 2026-11-19. Their status and branch head must be rechecked before merge. Review diffs and CI; update this table after each decision.

| PR | Scope | Current handling |
|---|---|---|
| [#149](https://github.com/Zanny001/zannychat-frontend/pull/149) | Docs: reconcile 17 Nov release and production evidence; 46 modules / 48 experiences; account-isolation and replay evidence | Reconcile with this register; avoid duplicate documentation and preserve unique evidence |
| [#151](https://github.com/Zanny001/zannychat-frontend/pull/151) | Stories/status feed virtualization | Inspect diff/CI and merge only if current, non-conflicting and green |
| [#159](https://github.com/Zanny001/zannychat-frontend/pull/159) | Bounded local collection/forwarding screens | Inspect diff/CI and merge only if current, non-conflicting and green |
| [#160](https://github.com/Zanny001/zannychat-frontend/pull/160) | Bounded New Chat contact directory rendering | Inspect diff/CI and merge only if current, non-conflicting and green |
| [#161](https://github.com/Zanny001/zannychat-frontend/pull/161) | Bounded inbox conversation rendering | Inspect diff/CI and merge only if current, non-conflicting and green |

**Closed historical branch:** PR #85 (Crown Aurora premium system) was reported closed and unmerged. Do not reopen or cherry-pick wholesale. Inspect current main and recover only specific missing, tested changes with a clear reason.

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
| UI-03 | Main / Chats | Responsive visual review; pagination, unread, filters, search, empty/error/offline states | In review — PR #161 |
| UI-04 | Chat | Composer, messages, replies, media, actions, receipts, keyboard and reconnect states | Not started |
| UI-05 | New Chat / contact discovery | Search, permissions, keyboard, bounded list, empty/error states | In review — PR #160 |
| UI-06 | Forward Message, Saved Messages, Drafts, Pinned Messages, Chat Folders | Real data, bounded rendering, actions, state and accessibility checks | In review — PR #159 |
| UI-07 | Shared Media / Chat Appearance | Responsive media bounds, filtering, theme preview and persistence | Not started |
| UI-08 | Updates / Stories | Creation, viewing, audiences, expiry, viewers, reactions, replies, mute and reporting | In review — PR #151; feature parity incomplete |
| UI-09 | Calls family | Incoming/outgoing, history, direct/group call, participant and failure states | Needs revalidation |
| UI-10 | LIVE family | All 18 audited experiences, 32 capabilities, safety and state coverage | Merged core work; detailed acceptance evidence needed |
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
| LIVE-01 | 18-screen Crown Aurora LIVE experience | All screens responsive, accessible and connected to actual services | Merged core; audit incomplete |
| LIVE-02 | Broadcast/Audio/Video room modes | Mode-specific permissions and correct media publishing | Implemented; production revalidation |
| LIVE-03 | Five-guest queue/invites/approval/removal | Enforced five-guest limit and authorization tests | Implemented; production revalidation |
| LIVE-04 | Movable/resizable guest tiles | Bounded drag/resize on supported devices and reduced-motion fallback | Implemented; device QA needed |
| LIVE-05 | Chat/comments/reactions/moderation/reports | Two-account delivery, rate limits, hide/block/report and moderator permissions | Needs revalidation |
| LIVE-06 | Battles/events/gifts/wallet/leaderboard/analytics | Real transactional models, abuse controls, clear Naira/unit conversion and audit trail | Not started / verify existing partial code |
| LIVE-07 | Replay recording/library/player | Egress completion, DB row, private object, signed playback, unauthorized denial | Source exists; production evidence needed |
| LIVE-08 | LIVE discovery/creator profile/notifications/settings | Real data, privacy and navigation | Needs revalidation |
| LIVE-09 | LIVE safety | Age/consent/blur/report/evidence and minor-safety controls | Blocked before random matching ships |

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

## 5. Immediate execution order

1. Reconcile current GitHub main, all open PRs, CI, backend main and Render/Vercel deployed SHAs. Decide each PR: merge, revise, close or defer—no blind merges.
2. Reconcile PR #149's audit evidence with this canonical register; retain unique facts, eliminate duplicate competing ledgers.
3. Complete the architecture baseline: frontend route/domain map, backend route/service map, Supabase data/RLS/storage map, provider/worker map.
4. Continue sequential interface work from Main/Chats through Chat, New Chat, message utilities, Shared Media and Chat Appearance; then proceed through remaining registered screens without skipping.
5. In parallel only where no overlapping files/domains, close the bounded rendering PRs and Stories work.
6. Complete messaging reliability and two-account acceptance before adding advanced message types.
7. Complete Stories, Groups/Communities, Channels and Events vertical slices.
8. Complete calls reliability and LIVE production acceptance, including replay pipeline proof and safety gates.
9. Complete privacy/security, E2EE and encrypted backup as separate reviewed programmes.
10. Only then expand bots, Mini Apps, business and monetization after product/legal/provider decisions.

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

This is a source-level inventory from frontend `main` at base commit `55fb010fc11b58590c26d111772d3db2cc0e08f3` and backend `main` at the latest commit observed in GitHub history, `14860064a87c7637fc4f15dc6d75f4084b6f696a`. It is not a complete dependency/data-flow audit.

### Frontend
- Expo SDK `~57.0.32`, React `19.2.3`, React Native `0.86.3`, React Navigation 7, Supabase JS `2.117.3`, LiveKit React Native `3.1.0` and LiveKit client `2.23.0`.
- Entry point `App.js` owns startup orchestration: font readiness/fallback, session restoration timeout, Supabase auth-state subscription, push registration coordination, presence owner lifecycle, notification tap subscription and app error boundary.
- `src/navigation/AppNavigator.js` imports **47 unique screen modules**. It declares 48 RootStack.Screen entries with 44 unique route names because QRContact, JoinGroup, LiveStream and LiveReplay are each declared more than once for conditional/deep-link route handling. Six primary tabs are confirmed: Chats, Calls, LIVE, Updates, Channels (labelled Explore) and Profile.
- The older 46-module inventory is therefore stale against this current source snapshot. Keep the historic 46/48 count as provenance for the 17 Nov audit, but use 47 imported modules / 48 stack declarations / 44 distinct route names as the current parsed baseline until a complete registry script independently verifies it.
- Current package scripts include unit contracts, release/contract/readiness/integrity audits, call recovery/native receiver checks and Expo web export. The workflow run triggered by PR #177 is currently in progress; record final results only after completion.

### Backend
- Node/Express API version `1.2.241`; a modular monolith with explicit route modules mounted by `src/index.js`.
- Current route modules observed: health, conversations, AI, internal webhook, LiveKit Egress webhook, link preview, safety, account, channels, discovery, calls, call history, group calls, LIVE streams and LIVE history. Mounts include `/health`, `/conversations`, `/ai`, `/link-preview`, `/safety`, `/account`, `/channels`, `/discovery`, `/calls/history`, `/calls`, `/group-calls`, two routers under `/live`, `/webhooks/livekit` and `/webhooks`.
- Background workers started by the API process include call invitation notifications, call-ended notification retries, group-call media cleanup, media participant/ended LIVE-room cleanup, stale call-session cleanup, account-storage cleanup and LIVE replay finalisation/recovery.
- Backend structure is therefore already domain-modular within one Express process; the next audit must inspect route-to-service/data dependencies and worker lifecycle before proposing architecture refactors. Do not split services just for architectural fashion.

### Open PR reconciliation note
- PR #149 changes two existing historical audit/tracker documents: `docs/FULL_APP_AUDIT_AND_RELEASE_REGISTER_20261116.md` and `docs/ROYAL_NEON_SCREEN_REDESIGN_TRACKER.md`. It contains unique 17 Nov production/catalog, migration, replay, security and screen-sequence evidence. Keep it open for review; reconcile its unique evidence into this canonical register before deciding whether to merge. Do not merge it blindly or create a third competing master register.
- PRs #151, #159, #160 and #161 are open and have distinct UI/performance scopes. Inspect their exact head commits, CI and current-main diffs before merge. PR #151 itself states that status service fetches are still not cursor-paginated and that privacy-picker/private-reply collections remain ScrollViews; retain those follow-ups.
- PR #177 has Netlify deploy-preview success and Vercel pending at the time of this update. Premium status/LIVE quality and Advanced calling client checks are still running; this is documentation-only, but do not claim green CI until both workflows finish.

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
- Public functions: 67 SECURITY DEFINER functions; all 67 have a pinned `search_path`; 28 are executable by `authenticated`; zero are executable by `anon`. The 28 authenticated-executable functions need function-by-function authorization review; the advisor warning is not proof of a vulnerability by itself.
- Applied migration history: **106 migrations**, latest `20261118223000`. The latest two LIVE migrations are present in backend source and applied history: `20261118221000_live_experience_modes` and `20261118223000_block_removed_live_participants`. Never rerun them.
- Security advisor: 37 informational RLS/no-policy findings, 28 authenticated-executable SECURITY DEFINER warnings, and one leaked-password-protection warning. Leaked-password protection is not enabled on the current Free plan; keep this as a disclosed residual risk within the ₦0 constraint.
- Performance advisor: 61 unused-index INFO findings. Do not mass-drop indexes from this snapshot; low traffic and short observation windows can make useful indexes appear unused. Review query plans and usage over a meaningful period before any removal.
- Health advisor: no findings at snapshot time.
- Supabase Edge Functions: none listed.
- The backend contains dedicated LIVE stream/history routes, LiveKit Egress webhook verification, replay worker and replay finalizer source. This verifies source presence only, not that production recording produced an object or playable replay.

**Next security work:** enumerate all 28 SECURITY DEFINER functions, inspect each body and grants, verify caller identity/ownership checks and delegated helpers, then write tests for allowed and denied callers. Do not revoke grants or alter function security wholesale. For the 37 backend-only tables, retain the privilege model and add a documented role/access inventory so future migrations do not accidentally expose them.


## 9. Production deployment and PR health reconciliation — 2026-11-19

### Production deployments verified
- **Frontend Vercel:** latest production deployment returned `READY` for frontend main commit `55fb010fc11b58590c26d111772d3db2cc0e08f3`. This confirms the deployment artifact is ready; it does not prove every user flow has passed acceptance.
- **Backend Render:** service `zannychat-backend-1` is configured for `main`, free plan, Frankfurt, health path `/health/live`; latest live deployment is commit `14860064a87c7637fc4f15dc6d75f4084b6f696a`. This matches the latest backend commit observed. Backend main is not currently 55 commits ahead of the live deployment.
- No deployment was triggered by this audit.

### Open PRs: exact reconciliation
- PR #149's audit branch compares as **15 commits ahead / 40 behind** current main. Its two changed files are historical audit/tracker documents and contain unique 17 Nov production evidence. Do not merge as-is; preserve the evidence and rebase/reconcile it deliberately.
- PR #151: both frontend workflows passed on head `58d5f208...`; Netlify preview ready. Branch is 8 ahead / 40 behind main. Its remaining gaps include unpaginated active-status service response and ScrollView-based privacy picker/private-reply list. Rebase/reapply before merge.
- PR #159: both frontend workflows passed on head `c426f453...`; Netlify preview ready. Branch is 8 ahead / 39 behind main. Rebase/reapply before merge.
- PR #160: both frontend workflows passed on head `3c75085d...`; Netlify preview ready. Branch is 2 ahead / 32 behind main. Rebase/reapply before merge.
- PR #161: both frontend workflows passed on head `9be0d300...`; Netlify preview ready. Branch is 2 ahead / 32 behind main. Rebase/reapply before merge.
- The Vercel preview checks on #149, #159, #160 and #161 failed due the team's Vercel free daily deployment cap, not a reported application test failure. Their Netlify deploy previews were READY. Do not upgrade a paid plan under the ₦0 constraint solely to clear these preview checks.
- PR #177 (this canonical two-document programme) latest head at this checkpoint: Premium status/LIVE quality workflow passed; Advanced Calling dependency audit passed while bundle exposure and client-quality jobs were still running; Netlify deploy preview succeeded; Vercel preview remained pending. Keep PR in draft until remaining required checks finish.

**Merge rule:** The four performance PRs have green historical CI but are too far behind current main to merge safely. Do not merge a stale head. Reapply only the reviewed, still-needed deltas to fresh branches from current main, close superseded PRs after replacements are validated, and preserve any unique tests/behaviour.
