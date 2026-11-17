# ZannyChat Full-App Audit & Release Register
**Audit date:** 2026-11-16  
**Status:** Active audit — not a production acceptance certificate  
**Budget constraint:** ₦0; prefer existing GitHub, Render, Supabase, LiveKit and Vercel free allowances.

## Executive position

The application has substantial implemented functionality, but the current evidence does not justify declaring it production-complete. Source review, automated checks, deployment readiness and real multi-account/device acceptance are separate evidence classes. This register records verified facts and open gates; it must be updated as work is completed.

## Verified repository and infrastructure baseline

- Frontend repository: `Zanny001/zannychat-frontend`, default branch `main`, package version `1.2.243`.
- Backend repository: `Zanny001/zannychat-backend`, default branch `main`, package version `1.2.241`.
- Supabase project `vithpppgyjmazxvogvno` is `ACTIVE_HEALTHY`, PostgreSQL 17.6.
- Vercel team slug is `zanny-chat`; project listing and deployment inspection are blocked until this connection is authorised for the exact team ID.
- Production Supabase migrations were applied during this audit: message INSERT integrity (`20261116195405`) and call-signal server timestamp/rate-limit integrity (`20261116195939`). Both are additive trigger/function changes with rollback procedures; the repository migration filenames are reconciled to the production ledger.

## Live pull-request state checked on 2026-11-16

| PR | State | Finding / gate |
|---|---|---|
| Frontend #86 — LIVE media reliability | Merged | Core browser/native media, role authority and lifecycle fixes merged. Real two-account/browser and two-physical-device acceptance remain outstanding. |
| Frontend #89 — LIVE Creator Studio | Merged | Rebased implementation from #88 is already in main: creator-only participant metrics, host/guest labels, guest capacity and native/web controls. Runtime acceptance remains outstanding. |
| Frontend #87 — LIVE discovery | Merged | Search/filter and replay-ready navigation improvements are in main. Search is limited to the returned feed, not global/paginated search. |
| Frontend #91 — Crown Aurora foundation | Merged | Premium visual foundation and source-level UI/UX audit/tracker are in main. Individual screen visual/device sign-off remains incomplete. |
| Frontend #90 — native auth sign-out revocation | Merged | Revocation marker persists in Keychain/Keystore and AsyncStorage; reinstall simulation is covered by a contract. |
| Frontend #93 — account-scoped drafts/outbox cleanup | Merged | Status drafts and pending local outboxes are isolated/cleared by account on deletion. |
| Frontend #95 — privacy-aware story avatars | Merged | Contact story avatars use privacy-filtered profile projections and private signed URLs where appropriate. |
| Frontend #98 — saved/folder cleanup | Merged | Deleted-account local Saved Messages and Chat Folders are cleared; these features remain device-local. |
| Frontend #88 — original stacked Creator Studio PR | Closed, not merged | Superseded by rebased PR #89; do not reopen. |
| Frontend #108 — direct-call LiveKit client with terminal-state guards | Merged | Direct LiveKit transport, WebRTC/TURN fallback, native lifecycle and terminal-state-safe group promotion are merged. Advanced calling client and Premium status/LIVE workflows passed on the exact final head. Physical Android/iOS and browser media acceptance remains outstanding. |
| Frontend #100 — chat history recovery | Merged | Initial and older-history failures now show accessible loading/error/empty states and retry actions. Both frontend quality workflows and Netlify preview passed. |
| Frontend #102 — permanent message retry failures (rebased) | Merged | SQLSTATE/error codes survive safe error mapping; permission, stale-reference, validation and auth failures are not queued/retried indefinitely. Both frontend quality workflows and Netlify preview passed. |
| Frontend #104 — member-favorites account cleanup | Merged | Permanent account deletion now clears only the deleted account's local directory favorites. Both frontend quality workflows and Netlify preview passed. |
| Backend #121/#122/#124 — superseded message guard attempts | Closed | Superseded by the corrected, merged backend PR #126. |\n| Backend #125 — CORS origin diagnostics | Merged | Logs only a sanitized rejected Origin; allowlist unchanged. Render deploy is live. |
| Backend #126 — message insert integrity | Merged | Production migration applied as Supabase version 20261116195405; repository filename aligned in backend PR #127. Rollback-only production smoke tests passed and left no test rows. |
| Backend #127 — message guard migration ledger alignment | Merged | Repository filename matches Supabase version 20261116195405. |
| Backend #128 — call signal server timestamps | Merged | Fixes client timestamp spoofing that could bypass the 120-signals/minute limit; applied as Supabase version 20261116195939. |
| Backend #129 — call signal migration ledger alignment | Merged | Repository filename matches Supabase version 20261116195939. |
| Backend #130 — user activity timestamp integrity | Merged | Added 14 timestamp triggers; CI passed. Initial dispatcher omission was found in post-apply review and corrected by #132. |
| Backend #131 — activity migration ledger alignment | Merged | Repository filename matches Supabase version 20261116203426. |
| Backend #132 — activity timestamp dispatcher correction | Merged | Explicitly handles all 14 attached tables; Backend quality and Advanced calling backend workflows passed. Corrective migration applied as 20261116203635. |
| Backend #133 — dispatcher migration ledger alignment | Merged | Repository filename matches Supabase production version 20261116203635. |
| Frontend #109 — audit register reconciliation | Merged | Canonical navigation inventory and current production evidence recorded in this document. |

## Navigation inventory reconciliation

The previously agreed ordered inventory is: Onboarding, Login, Signup, VerifyEmail, PasswordRecovery, PasswordReset, Main, Chats, Chat, NewChat, ForwardMessage, SavedMessages, Drafts, PinnedMessages, ChatFolders, SharedMedia, ChatAppearance, PeerProfile, QRContact, ContactDiscovery, CreateGroup, GroupManagement, JoinGroup, Channels, Polls, Events, Calls, IncomingCall, OutgoingCall, Call, GroupCall, LiveHub, LiveStream, Updates, Profile, EditProfile, Settings, PrivacySecurity, Notifications, DataStorage, DataExport, Sessions, Help.

Five experiences were added in the current navigator and must also be audited: LiveReplay, LiveCreatorProfile, ScheduledMessages, LIVE (tab), and StatusUpdates. The shared Channels route is counted once. The 43 + 5 = 48 total is the canonical current audit scope.

## Workstream A — LIVE

**Verified:** browser remote-track participant handling, server-issued creator/guest/viewer role authority, explicit subscription configuration, heartbeat lifecycle and end/leave confirmation changes are present in merged frontend #86. Backend main contains LIVE stream routes, token role enforcement, guest moderation, reporting, reaction and replay worker code. Supabase inventory shows LIVE tables protected by RLS with direct client access intentionally withheld.

**Not proven:** remote RTP audio/video delivery between independent accounts/devices; guest promotion/demotion across token renewal; camera/mic transitions; network loss recovery; end-to-end Egress recording, webhook finalization, private object upload, playback, expiry and deletion. The current production snapshot has 0 replay rows and 0 objects in the private `live-replays` bucket; replay E2E is therefore not proven.

**Verified addition:** Creator Studio is already present in main through rebased PR #89; LIVE discovery improvements are present through #87. **Next:** verify creator-only Studio visibility, participant refresh lifecycle, host/guest labels and web/native moderator parity in runtime; complete browser two-account and Android two-device media acceptance; create and play one real test replay; verify viewer/guest/creator permissions and moderation.

## Workstream B — Calling

**Verified:** frontend PR #108 is merged with direct LiveKit transport, WebRTC/TURN fallback, native lifecycle handling and terminal-state-safe direct-to-group promotion. Backend package scripts include call signaling, group-call, conference upgrade, heartbeat lease, notification and cleanup tests.

**Not proven:** incoming/outgoing audio and video on physical Android/iOS devices; background/terminated incoming-call handling; speaker/Bluetooth route changes; camera/mic switching; reconnects; participant addition; direct-to-group promotion; CallKit/Android Telecom lifecycle and cleanup under process death.

**Next:** inspect client/server transport parity and fallback behavior; run browser plus two-device acceptance; verify notification delivery and native lifecycle; only then change production transport defaults.

## Workstream C — Messaging

**Verified:** rebased frontend #102 distinguishes permanent from transient send errors, preserves safe Postgres error codes/status, avoids queuing permanent failures, and removes permanently rejected items discovered by background retry. The send API reuses the request ID and attempts to recover the committed row after SQLSTATE 23505 before surfacing an error.

**CI result:** frontend PR #102 is merged. The final Premium status/LIVE quality and Advanced calling client workflows both passed on the exact final head, and the Netlify deploy preview succeeded. The Vercel check was blocked by the team build-rate-limit at that point.

**Next:** audit send/delivery/read receipts, optimistic state, outbox and attachment retry, edits/deletes/replies/forwarding, drafts, offline sync, pagination, search, notification and multi-device consistency. Test network interruption, duplicate delivery and read-after-commit recovery.

## Workstream D — Security and privacy

**Production SQL inventory:** 67 public SECURITY DEFINER functions inspected. Zero have unpinned search_path, zero grant EXECUTE to PUBLIC, and zero grant EXECUTE to anon. All 28 functions executable by authenticated users were individually reviewed. Each binds the operation to `auth.uid()`, conversation participation, ownership, profile/status visibility or block rules, with bounded inputs/rate limits where relevant. The five functions using `search_path=pg_catalog, public` are still pinned; neither anon nor authenticated can CREATE in `public`. This is a positive source/catalog baseline, not a complete penetration test.

**Applied P1 fixes:**
- Backend PR #126 added `private.guard_message_insert_integrity()` as an invoker-only BEFORE INSERT trigger on `public.messages`. It server-stamps creation metadata, clears client-supplied edit/retraction fields, binds replies to the same conversation while preserving replies to deleted tombstones, and verifies chat-media object ownership/path. Supabase recorded version `20261116195405`; backend PR #127 aligned the repository filename. Transactional smoke checks covered forged sender, timestamp override, cross-conversation reply and valid attachment. All test inserts were rolled back; no rows persisted.
- Backend PR #128 hardens `public.validate_call_signal_insert()` as described in the Calling workstream; Supabase recorded version `20261116195939`; backend PR #129 aligns the repository filename.

**RLS and storage inventory:** sampled live catalog shows RLS enabled on the audited public tables; zero anon table privileges were found. Twenty-six RLS-protected tables grant at least one direct operation to authenticated users, with policies scoped to ownership, conversation membership, participant identity or eligible status audience. Call-session UPDATE has broad column grants, but its SECURITY DEFINER trigger validates immutable identity fields and enforces the call state machine. Five storage buckets exist: only `avatars` is public; `chat-media`, `status-media`, `live-replays` and `private-avatars` are private. The three remaining objects in `avatars` were mapped to profiles whose profile and photo visibility are both `everyone`; privacy transition triggers reject direct visibility changes unless public avatar URLs and objects have first been removed. LIVE replay objects have no direct client storage policies, consistent with service-role-only upload/playback signing. Storage policy definitions for chat media, private avatars and status media include conversation membership, owner path and audience authorization checks.

**Advisor items:** leaked-password protection is disabled; enablement needs an Auth configuration change and confirmation that it is available in the current plan. The advisor currently reports 37 RLS-enabled tables without policies. A direct catalog check confirms zero anon and zero authenticated table privileges on all 37, consistent with backend/service-role-only tables; do not add broad policies to silence the advisor. All 28 authenticated SECURITY DEFINER RPCs have now been individually inspected; retain regression tests and revisit them whenever their definitions or grants change.

**Applied P2 integrity hardening:** Backend PR #130 adds a SECURITY INVOKER, empty-search-path trigger across 14 activity/presence/moderation tables. Post-apply review caught an incomplete table-dispatch branch in the first migration; backend PR #132 corrected it with explicit branches for every attached table and a fail-closed exception. Both Backend quality and Advanced calling backend workflows passed on the corrective PR. Supabase production versions `20261116203426` and `20261116203635` are applied; catalog confirms 14 triggers and no direct anon/authenticated EXECUTE. Explicit NULL read-cursor resets (mark unread), existing profile visibility and pinned-message snapshot triggers, and all RLS/table grants are preserved. A full production catalog scan of public timestamp/date columns now finds zero authenticated-writable timestamp fields on tables without a BEFORE INSERT/UPDATE trigger.

**Next:** inspect all RLS table grants and storage policies; verify signed URL expiry and object ownership; audit auth/session storage on web/native; inspect account deletion and cleanup; validate CORS allowlist and security headers; test rate limits, input validation, enumeration resistance, token revocation and privilege escalation. End-to-end encryption is not to be advertised unless implemented and verified.

## Workstream E — Premium interfaces (48-experience programme)

Design direction: Crown Aurora — deep navy/void surfaces, violet and cyan accents, restrained crown gold, moderate content/video containers, refined glass treatment, controlled motion, strong typography and accessible contrast. The foundation is merged through PR #91. Preserve working navigation, real data and service-backed actions. The original 36-screen estimate is superseded by the verified 48 unique navigation experiences (43 root-stack routes plus six tabs, with Channels shared), 46 registered modules and 49 implementation files including platform variants. Keep the agreed messaging-first priority order, but cover all current experiences without omission or double-counting. No screen is marked complete based on a mockup alone.

For each of the 48 experiences record: layout hierarchy, responsive breakpoints, tap-target sizes, text scaling, light/dark and custom palettes, loading/empty/error states, accessibility labels, data provenance, navigation, destructive confirmation, keyboard behavior and interaction tests. Current tracker entries remain `[~]` until these checks are complete.

## Workstream F — Performance and infrastructure

Audit cold start, bundle size, memory, battery, list virtualization, image/video memory, database indexes/query plans, realtime subscription cleanup, retry storms, Render worker health, Supabase storage growth, Vercel routing/build settings, dependency vulnerabilities and low-bandwidth behavior. Do not remove indexes solely because the current low-traffic advisor labels them unused. The latest Supabase Performance Advisor read reports 61 unused indexes; this is low-traffic evidence, not a reason for blind index removal.

**Production checks:** Render backend latest deployment for CORS-origin diagnostics is live. Backend CORS allowlist already includes `https://zannychat.vercel.app` and the primary Netlify origin. The diagnostic logger was deployed without broadening the allowlist; no new 403 CORS request logs appeared in the first queried minute after deployment. No 5xx request logs were returned in the queried window.

**Vercel blocker:** the team/domain can be read, but project creation returned HTTP 403. No Vercel project or deployment was created. The `zannychat.vercel.app` project must be created after the connected integration receives project-write permission. A one-time Vercel team authorization link has been generated for the owner; approval is still pending. Current Vercel commit checks also return a `build-rate-limit` upgrade gate, and the team-scoped project list still returns zero linked projects. The verified `zannychat.com` domain currently has no project attached and no verified nameserver configuration.

## Workstream G — Release and operational acceptance

Required evidence before production completion:
1. Frontend unit/contract/integrity/release audits pass on the exact release commit.
2. Backend unit/integration/migration reconciliation/security suites pass on the exact release commit.
3. Supabase migration ledger matches repository migrations; backup and rollback path verified.
4. Web production domain, deep links, CORS, auth and direct refresh tested.
5. Android installable signed build tested on at least two physical devices; iOS tested on a physical device when available.
6. Two-account messaging, calls and LIVE tests pass; permissions and block/privacy boundaries are tested.
7. Push notifications, media uploads, replay, account deletion and recovery paths are exercised.
8. Production smoke checks and logs show no unresolved critical errors after rollout.

## Release status vocabulary

- **Source reviewed:** implementation inspected; not runtime proof.
- **Automated pass:** named workflow passed on an identified commit.
- **Preview verified:** deployed preview actually opened and exercised.
- **Device accepted:** real physical-device test completed.
- **Production accepted:** production smoke and operational evidence completed.

Never promote one status to another without evidence. Do not invent analytics, earnings, view counts or successful media delivery. Keep monetisation/wallet work deferred until a secure ledger, purchase verification and reconciliation are designed and tested.


## Reconciled completion checkpoint — 2026-11-16 21:30 UTC

- Frontend PR #93 (account-scoped Status drafts and local outbox cleanup), #98 (Saved Messages and Chat Folders deletion cleanup), #99 (Chat Folders recovery), #100 (Chat history recovery), #102 (permanent message-send failure classification), and #104 (member-directory favorites cleanup) are now merged to `main`.
- Final frontend CI passed on the exact heads for #100, #102 and #104; each has a successful Netlify deploy preview. The Vercel integration has since produced a successful preview check on the documentation register PR, but the team-scoped project-management API still requires the owner to approve a one-time Vercel team authorization request before project settings/deployments can be inspected.
- Frontend PR #108 has now merged after both Advanced calling client and Premium status/LIVE workflows passed on its exact final head. Physical Android/iOS/browser acceptance is still a mandatory release gate.
- Current main has the ChatScreen initial-history and older-page retry states. Messaging source audit also found and fixed a permanent-failure outbox loop; no claim is made that cross-device message sync or E2EE exists.
- Account deletion cleanup now covers message drafts, pins, text and attachment retry queues, Status drafts, Channel drafts/recent-channel IDs, Saved Messages, Chat Folders and member-directory favorites. Notification/media/theme preferences remain device-level preferences, not account content.
- Production Supabase catalog recheck: 67 public SECURITY DEFINER functions; 0 executable by PUBLIC, 0 by anon, 28 by authenticated; 0 without pinned search_path. 37 RLS-enabled public tables without policies have 0 anon/authenticated table privileges. Storage currently has five buckets (one public legacy avatars bucket, four private buckets); all three remaining public avatar objects currently map to profiles whose profile and photo visibility are both everyone. Profile visibility transition triggers protect against direct client-side bypass by requiring public URLs/objects to be removed before a restrictive visibility setting is accepted.
- No production Vercel deployment, native release build, physical-device acceptance, or real LIVE replay Egress cycle is certified by this documentation update.


### Security hardening update — 2026-11-16 21:30 UTC

- Backend PR #125 (sanitized CORS rejection diagnostics), #126 (message INSERT integrity), #127 (message migration ledger reconciliation), #128 (server-time call signal rate limiting), #129 (call-signal migration ledger reconciliation), #130 (activity timestamp triggers), #131 (activity migration ledger reconciliation) #132 (activity timestamp dispatcher correction) and #133 (dispatcher migration ledger alignment) are merged.
- Supabase production migration versions `20261116195405` and `20261116195939` are recorded and verified. Both changes were additive; transaction-only smoke checks were rolled back and no test rows persisted.
- Backend PR #132 corrected the first activity timestamp migration's incomplete table dispatcher after post-apply review. The corrective migration is applied and verified; PR #133 aligned its repository filename with Supabase's recorded version. A follow-up catalog scan found no remaining authenticated-writable timestamp/date columns without a before-write trigger.
- Frontend PR #108 is merged with successful CI on its exact head. Physical-device/browser calling acceptance remains open.
- Frontend PR #109 (this audit register reconciliation) is merged.
- No Vercel production deployment or native production build is claimed. Vercel project-write permission remains a separate integration blocker.


### SECURITY DEFINER RPC review — 2026-11-16

The 28 public SECURITY DEFINER functions executable by `authenticated` were individually inspected in the production catalog. Their bodies bind to the caller via `auth.uid()` and/or enforce conversation membership, ownership, status/profile visibility, block relationships, bounded input arrays, and per-user rate limits. None grant EXECUTE to anon or PUBLIC. All 28 have an explicit pinned search_path; five use `pg_catalog, public`, and catalog verification confirms neither anon nor authenticated has CREATE privilege on `public`. These are intentional API RPCs, not automatically removable advisor warnings. The 37 RLS-enabled tables without policies have no anon or authenticated table privileges and remain backend/service-role-only; do not add blanket policies.


### Push-token lifecycle and deployment checkpoint — 2026-11-17

- Frontend PR #114 is merged: device-local sign-out now removes only the current device's Expo push token before clearing the Supabase session; explicit sign-out-everywhere removes all Expo push tokens for that account. VoIP/APNs cleanup remains intact. The deletion helper fails closed if the device token cannot be resolved, so local sign-out never accidentally deletes other devices' tokens.
- Frontend PR #113 is merged: push registration is deduplicated per authenticated user rather than once per app lifetime. The coordinator resets on SIGNED_OUT, permits account changes, and passes the expected user ID into token registration. A stale registration attempt refuses to write if the current Supabase user no longer matches.
- Production Supabase catalog verification for `public.push_tokens`: the authenticated policy is `ALL` with both USING and WITH CHECK bound to `auth.uid() = user_id`; `push_tokens.user_id` references `profiles(id)` with `ON DELETE CASCADE`. No database policy or schema change was needed for these client fixes.
- Both PRs passed the Premium status/LIVE quality workflow. PR #114 also passed Advanced calling client checks; PR #113 passed Advanced calling client checks after its existing static regression test was updated to assert the new account-scoped coordinator. The exact PR heads also passed frontend quality, Expo web/Android exports, JS unit/call tests, release audits and integrity tests.
- Netlify deploy previews for both PRs reached `ready`. The `main` production deploy was skipped with `account credit usage exceeded`; previews do not constitute production deployment or acceptance.
- Vercel's GitHub integration is now posting deployments for project `zannychat` (team `zanny-chat`, project ID `prj_OOi2wCB33VrD2oV1DiuGqmhezByZ`). The PR #119 and #125 preview deployments were both reported `Ready` by Vercel's GitHub bot. This corrects the earlier statement that no Vercel project/deployment existed. However, the connected Vercel MCP API still returns an empty team project list and 404 for project/deployment inspection, and a lookup of `zannychat.vercel.app` returns 404. Therefore these are confirmed preview deployments only; the production alias/domain is not confirmed. Vercel's bot also reported the Hobby free daily deployment cap (>100/day) on some earlier attempts, so avoid repeated rebuilds or paid upgrades under the ₦0 constraint.
- Direct inspection of `vercel.json` confirms the CSP currently contains only `frame-ancestors 'none'; base-uri 'self'; object-src 'none'` and lacks a complete directive allowlist. Do not enforce a guessed restrictive CSP; inventory the built bundle and observed browser origins, validate Report-Only against OAuth, Supabase, Render, LiveKit and media, then enforce.
- No paid plan upgrade, production database schema change, blanket RLS change, or index deletion was made. Android/iOS physical-device push, call, LIVE creator/guest/viewer and replay Egress-to-private-storage-to-playback acceptance remain open.


### LIVE replay production audit correction — 2026-11-17

The backend source does contain a complete initial replay implementation; the previously recorded zero-row/zero-object production snapshot should not be interpreted as proof that the code path is absent. The current source includes authenticated creator-only start/stop, LiveKit Egress MP4 output to private Supabase S3 storage, raw signed webhook verification, bounded duration/size validation, signed playback URLs, quota reservation/finalization, worker recovery and seven-day object cleanup.

Fresh production checks:
- `live_stream_replays` has RLS enabled, no policies and no direct anon/authenticated table privileges; service-role only.
- The three replay quota/storage RPCs are SECURITY DEFINER with empty search_path and EXECUTE granted only to postgres/service_role.
- `live-replays` is private, accepts MP4 only, and has a 48,000,000-byte object cap.
- Replay rows: 0; replay objects: 0; quota: 0 reserved seconds, 2 used seconds, no active replay.
- No database changes were made.

The current replay budget is five minutes per recording, 50 minutes total per calendar month, one globally active replay at a time, 48 MB per file and seven-day retention. The production Render feature flags and Egress/webhook runtime logs were not re-verified in this pass. Backend PR #134 is merged: completed Egress is now reconciled by ID or exact output path through the shared webhook finalizer; both backend quality workflows passed, including LIVE/replay tests. Real production Egress-to-object-to-signed-playback acceptance remains open. Frontend PR #117 has merged explicit replay service-error and empty-library states; Advanced Calling and Premium LIVE workflows passed. Production Egress-to-object-to-signed-playback acceptance remains open.


### Presence, LIVE role capability and deployment update — 2026-11-17

- Frontend PR #119 is merged. It caches each successfully registered Expo push token in a per-user device-local key, revokes exactly that cached token during local sign-out, clears the cache only after successful server deletion, and preserves explicit account-wide token revocation for sign-out-everywhere. It also retries registration after a null/skipped attempt. Frontend quality, Premium LIVE quality and Advanced Calling client checks all passed; the Vercel and Netlify previews were reported Ready.
- Frontend PR #125 is merged. Presence tracking is now subscriber-owned: the first screen subscriber starts heartbeat/polling; the final subscriber stops it; all explicit sign-out paths flush offline presence before auth teardown; stale startup/refresh responses cannot reinstall timers after logout. Current-head Android/Kotlin, Expo export, unit/integrity, Advanced Calling and Premium LIVE workflows passed.
- Frontend PR #126 is merged. LIVE guest-management capability now requires the server-issued creator role plus stream.allow_guests; guest/viewer guest-request polling is disabled, and publishing still requires server-issued guest role plus canPublish. Advanced Calling and Premium LIVE workflows passed. Real two-account/browser and physical-device role-isolation acceptance remains open.
- Frontend PR #117 is merged; the LIVE Hub now distinguishes replay API failure from an empty library, provides retry and explains the seven-day replay window. The backend replay pipeline is present in source, but production currently has zero replay rows and zero objects. LiveKit Egress-to-private Supabase storage-to-signed playback remains an unverified production acceptance gate.
- Frontend PR #128 is merged: the offline presence flush is bounded at 1.5 seconds so a poor network cannot trap sign-out. PR #130 is merged: Status read markers and dwell-duration preferences are stored under account-scoped keys; legacy global keys are discarded; the previous account's cached Status feed is cleared on profile changes. PR #131 is merged: presence cache, listeners and timers reset when the Supabase auth owner changes. All three PRs passed the relevant Advanced Calling and Premium LIVE workflows. PR #132 is merged: Google account-deletion reauthentication is bound to the exact current Supabase user and expires after 4 minutes 30 seconds, within the backend's five-minute auth_time rule. Both Advanced Calling client checks and Premium LIVE quality passed.
- Netlify PR previews are working. The main production deploy for PR #128 was skipped because account credits were exceeded; the main deploys for PR #130 and #131 were still in the `new/building` state at the latest check, so no current Netlify production release is claimed.
- The Vercel project is evidenced by GitHub integration bot comments for `zannychat` (project ID `prj_OOi2wCB33VrD2oV1DiuGqmhezByZ`) and Ready PR previews, including PR #119. Subsequent bot comments report the Hobby daily deployment quota exceeded (`api-deployments-free-per-day`, more than 100 deployments in 24 hours). The connected Vercel API integration still returns zero team-scoped projects and 404 for project/deployment inspection, so its access scope is inconsistent with GitHub's integration evidence. The intended production alias `zannychat.vercel.app` remains unverified. Do not promote a preview or assume the alias exists.
- The partial CSP remains intentionally unexpanded until browser origins are inventoried. Leaked-password protection remains an open Supabase Auth configuration item; the connected Supabase tool surface does not expose Auth settings for safe in-chat modification.

- Account deletion remains protected server-side by a five-minute `auth_time` check in `/account/delete`; PR #132 hardens the client-side Google reauth state so proof from account A cannot be reused for account B.


### Follow-up acceptance and source-audit update — 2026-11-17

- PR #119 is merged; account-scoped Expo token persistence and exact-token revocation are covered by the successful frontend quality, Advanced Calling and Premium LIVE workflows. The Vercel bot reported a Ready preview for the exact PR head, but a later event also reported the 100-deployments-per-24-hours Hobby limit. Neither event establishes the current main production deployment.
- PR #117 is merged; its UI truthfully distinguishes replay service failure from an empty library. No production replay rows or storage objects were present in the latest verified snapshot; playback remains unaccepted.
- PR #132 is merged at `1f3d8e6e9f744e0b9d3f205a9bd46033c8be6324`. Both Advanced Calling and Premium LIVE workflows passed. The account deletion flow now binds provider reauthentication proof to the exact current user and uses a 4m30s client expiry under the server's 5m auth_time requirement.
- The stale duplicate PR #123 was closed as superseded by merged PR #130; the older v2 storage-key implementation was not merged over the current main-branch account-scoped storage contract.
- PR #135 is merged at `f386f8cf33fda3918e69a2522b2bfdcdc48de001`. Its Advanced Calling and Premium LIVE workflows passed. It clears account-specific Status privacy recipients, contact lists, reply drafts/pagination, reaction locks and overlays on account switch. This supplements (not replaces) the already merged account-scoped Status seen markers and duration preferences.
- PR #134's documentation checkpoint has been refreshed to include the above changes; its Netlify preview reached Ready. The production Netlify deploy remains credit-limited, and Vercel preview builds are daily-quota limited. No paid upgrade or production deployment is claimed.


### Production deploy evidence — 2026-11-17 09:09 UTC

- Netlify site `zannychat` reports a current published production deployment in state `ready`: deploy `6af9a18fac2953aa5dda53f5`, created 2026-11-15 12:11:59 UTC, branch `main`, commit `27d76827e2259d14e00e2717fd0b8ebc35b63011`.
- The current GitHub `main` is 57 commits ahead of that production commit. Therefore Netlify is reachable and serving a Ready build, but it is materially stale relative to the latest merged source. Do not describe recent fixes as production-live until a new main deployment is ready and smoke-tested.
- The latest Netlify PR previews for PR #135 (Status account-switch UI reset) and PR #137 (ChatList story read-marker account scope) both reached `ready`; preview readiness does not promote either change to production.
- PR #137 is under Advanced Calling and Premium LIVE CI. It corrects a missed call site: `ChatListScreen` omitted the required account ID when reading Status seen markers, causing the story tray to treat all statuses as unseen. The PR scopes the read to `ownProfile.id` and invalidates stale feed loads on profile change. Its first CI run exposed one stale test assertion that expected the previous `user?.id` call; the assertion was updated to the new `userId` contract and CI restarted.
- PR #135 has merged after Advanced Calling and Premium LIVE quality workflows passed. Its Vercel GitHub bot reported a Ready preview for the exact commit, but Vercel also reported the daily Hobby deployment cap exceeded. The intended production alias is still unverified.


---

## Coordinated programme checkpoint — 2026-11-17 12:00 WAT

This checkpoint supersedes earlier pull-request snapshots in this register. It records source, CI and read-only production evidence; it is not a production acceptance declaration.

### Frontend main and account isolation

- Frontend main at checkpoint: `8ad25aeb5b09a92ef69f7cd4b91b058e20440148`.
- PR #146 (`fix(chats): isolate inbox data across account changes`) merged as `ccad57d00d7e4a18e71a1d84880d533e3427c49c`. The updated head passed both Advanced calling client checks and Premium status/LIVE quality; its Netlify and Vercel preview checks passed.
- PR #147 (`fix(chats): isolate New Chat directory across account changes`) merged as `8ad25aeb5b09a92ef69f7cd4b91b058e20440148`. Both GitHub Actions workflows passed and Netlify preview passed. Its Vercel preview reported the team build-rate-limit gate; this was not an application test failure.
- The merged fixes clear account-owned inbox, folder, presence, pagination, contacts and favourites state on auth changes, and prevent stale asynchronous responses/writes from crossing account boundaries. Real two-account acceptance remains required before production release.
- LIVE PR #86 remains merged. Creator Studio and HOST/GUEST role separation are already present on current main. PR #88 was closed without merge; its recovered duplicate draft #148 was closed as superseded after confirming the current main code and audit document already contain the implementation. No duplicate LIVE code was merged.
- Current main's Vercel status is pending at this checkpoint. No production deployment was triggered from this audit.

### Fresh Supabase security and storage review

Read-only catalog and advisor checks against project `vithpppgyjmazxvogvno`:

- Project status: ACTIVE_HEALTHY; organization plan: Free.
- Latest applied migration observed: `20261117005015_publish_conversations_realtime`. The latest three Realtime publication migrations for conversation participants, message reactions and conversations are present in both the applied ledger and backend repository.
- Security advisor: 37 RLS-enabled tables without policies (INFO); 28 SECURITY DEFINER functions executable by `authenticated` (WARN); zero such functions executable by `anon`; leaked-password protection disabled (WARN).
- The 37 no-policy tables have no direct table privileges for `anon` or `authenticated`; they remain backend/service-role-only. Do not add broad RLS policies merely to silence the INFO finding.
- All 28 authenticated-executable SECURITY DEFINER functions have a pinned search_path. Four do not contain a direct `auth.uid()`/JWT reference: two poll overloads delegate to guarded implementations; avatar/cover path helpers delegate to privacy-guarded profile functions. The reviewed profile/status helpers bind the viewer to `auth.uid()`. The `public` schema does not grant CREATE to anon, authenticated or service_role.
- Leaked-password protection remains unavailable on the current Free plan. Do not upgrade or add paid spend under the ₦0 constraint; retain this as a documented residual risk.
- Storage remains: public `avatars` (3 objects), private `private-avatars` (4), private `chat-media` (14), private `status-media` (6), private `live-replays` (0). No object was deleted. The `live-replays` bucket is private, MP4-only and capped at 48,000,000 bytes; no direct client storage policy exists for that bucket.

### LIVE replay: source implementation versus production acceptance

- Current backend source contains the replay start/stop/list/playback routes, managed LiveKit Egress integration, signed playback URLs, webhook signature verification, replay finalizer, stop/recovery/retention worker and focused regression tests.
- Replay constraints in source/migrations: up to 300 seconds per recording, 48,000,000 bytes per file, 3,000 seconds (50 minutes) per creator per calendar month, seven-day retention and six-minute signed playback URLs. Recording is fail-closed unless replay enablement, build-plan confirmation, LiveKit Egress credentials and private Supabase S3 credentials are configured.
- Fresh production snapshot: 0 `live_stream_replays` rows, 0 `live-replays` objects, 0 reserved seconds and 2 used quota seconds for November. All 7 stored LIVE stream rows are ended. These facts do not prove an Egress recording, upload, webhook finalisation or playback succeeded.
- Mandatory acceptance remains: real creator broadcast → Egress MP4 → signed webhook → private bucket object → creator/viewer-authorised signed playback → expiry/deletion and quota reconciliation.

### Backend deployment reconciliation

- Backend GitHub main at checkpoint: `4a64d057a030d5be3ef639991960a3c0494ed989`.
- GitHub comparison shows 55 commits after the last Render deployment SHA recorded in the prior audit (`c59dac1395f59fcaf12e9bfe7b771d01c45d718f)), including runtime changes to LIVE replay recovery/finalisation, call routes, CORS and other services, as well as migrations and tests.
- Do not assume the older deployment record is current or that every commit is deployed. Render deployment state must be checked against the current service before production is declared synchronized. No Render service or deployment was changed in this checkpoint.

### Premium interface programme

- The current canonical register tracks 46 screen modules across 48 navigation experiences. The earlier 36-screen list is not the complete current route inventory; reused modules and route aliases must not be counted as separate redesigns.
- All 46 registered modules have a first-pass source review logged. This is not completion of the visual redesign: individual visual hierarchy, responsive sizes, keyboard/scroll behaviour, accessibility, empty/loading/error states, light/dark/custom palette matrix and device acceptance remain open.
- A standalone 18-view Crown Aurora LIVE product-design presentation was prepared from the three supplied HTML references. It is a local interaction/design prototype only; sample identities, audience counts and financial labels are illustrative and it is not connected to production services.

### Release blockers retained

1. Two-account browser acceptance for account switching, messaging privacy and creator/guest/viewer LIVE role boundaries.
2. Two-physical-device Android/iOS acceptance for direct and group calls, remote audio/video, background/foreground recovery, reconnect and terminal call states.
3. End-to-end LIVE replay recording, private storage, signed playback, expiry and deletion.
4. Production-configured Android/iOS builds and push/call lifecycle acceptance; source compilation and CI do not replace device tests.
5. Encrypted persistence design for pending message text; AsyncStorage remains app-private but is not Keychain/Keystore encryption.
6. No E2EE claim: message content remains plaintext at the application/database layer.
7. Render deployment SHA reconciliation and Vercel deployment/build availability.
8. Full visual and interaction acceptance across all 46 registered screen modules.

No paid-plan upgrade, production database mutation, blanket RLS change, object deletion or production deployment was performed for this checkpoint.


### Additional database hardening and interface performance evidence

- A full public-function ownership/grant count returned 70 public functions, all owned by `postgres`; 67 are SECURITY DEFINER, 28 are executable by `authenticated`, and zero are executable by `anon`.
- The default ACL for postgres-created public functions grants execution to `authenticated` and `service_role`, not `anon`. The separate `supabase_admin` default ACL includes `anon`, but there are currently no public functions owned by `supabase_admin`. Keep migrations/functions owned by the reviewed migration role and explicitly revoke `anon` if a future public RPC is created under a different owner. Do not blanket-change Supabase system defaults.
- The first 11 messaging/navigation surfaces were rechecked for list rendering. Chats, Chat, New Chat and Forward Message already use virtualized lists. Chat Appearance is a fixed, small canvas-selection form and appropriately remains a ScrollView. Chat Folders is user-created and has no product-level folder cap, so it is included with Saved Messages, Drafts, Pinned Messages and Shared Media in PR #150. Those previously mapped collections inside ScrollView; the PR converts them to FlatList with stable keys, retained empty/error states and bounded Shared Media batches. CI and regression acceptance are pending; this is not yet merged.


### First 11 navigation experiences — sequential source review

| Sequence | Experience | Source-level finding | Status |
|---:|---|---|---|
| 01 | Main | Six established destinations remain: Chats, Calls, LIVE, Updates, Explore/Channels and Profile. Floating glass tab bar uses reduced-motion handling and disables costly backdrop blur on older Android versions. | Navigation preserved; device visual review pending |
| 02 | Chats | Virtualized conversation list; horizontal story and filter rails are bounded. 48-point actions and explicit loading/error/empty states. Account-change isolation merged in PR #146. | Source pass complete; two-account acceptance pending |
| 03 | Chat | Virtualized message list, keyboard-avoiding composer, attachment recovery and 48-point action targets. | Source pass complete; device/keyboard acceptance pending |
| 04 | New Chat | Virtualized contact directory and moderate 76-point contact rows. Account-owned directory/favourites reset and stale-write guards merged in PR #147. | Source pass complete; two-account acceptance pending |
| 05 | Forward Message | Virtualized recipient list and search; no unbounded ScrollView collection found. | Source pass complete |
| 06 | Saved Messages | Previously mapped the collection in ScrollView; FlatList conversion and stable keys are in PR #150. | CI pending |
| 07 | Drafts | Previously mapped drafts in ScrollView; FlatList conversion retains local-only semantics and retry/delete states in PR #150. | CI pending |
| 08 | Pinned Messages | Previously mapped pinned rows in ScrollView; FlatList conversion retains search and open-original-message actions in PR #150. | CI pending |
| 09 | Chat Folders | User-created folders have no product-level cap; converted from ScrollView mapping to FlatList in PR #150. Folder configuration remains device-local. | CI pending |
| 10 | Shared Media | Previously accumulated paginated media in ScrollView; PR #150 uses FlatList, two-column photos, one-column files/links, 30-message pages and bounded six-page load actions. | CI pending |
| 11 | Chat Appearance | Canvas choices are a small fixed settings list; ScrollView is appropriate. Preview clearly states appearance changes do not modify message content. | Source pass complete |

The first 11 screens now have a source-level performance and interaction pass. This does not replace the planned individual visual review of spacing, safe areas, contrast, light/dark/custom palette behaviour, keyboard handling, accessibility and real-device presentation.


### Screen 12 — Stories / Status Updates

- The current screen already prioritises the signed-in user's profile avatar for "My status", falling back to the user's own image story only when no profile picture is available. This preserves the previously requested profile-picture behaviour.
- Status composition supports text/photo/video, 30-second video and 50 MB media limits, 6/12/24/48-hour expiry, contacts/selected/only-me audiences, excluded contacts, muted accounts, reactions, private replies and per-status viewer counts.
- The current service applies client-side visibility filtering as defence in depth while database RLS and recipient policies remain the security boundary.
- The screen previously rendered all recent status groups and friend avatars through ScrollView mapping. PR #151 replaces the vertical recent-status collection and horizontal friend rail with FlatList virtualization; the story composer, discover shelf and privacy surfaces are preserved.
- Remaining performance/privacy work: `listActiveStatuses()` still retrieves the active status set without cursor pagination; the status privacy contact picker and private-reply list still use ScrollView mapping. These are explicit follow-up items, not marked complete.
- Real-device photo/video playback, audience isolation, status expiry, notification and multi-account acceptance remain open.


### Screens 13–15 — profile sequence

| Sequence | Experience | Source-level finding | Status |
|---:|---|---|---|
| 13 | Own Profile | Static profile dashboard with theme-aware surfaces and 48-point primary actions; no unbounded feed collection found. | Source pass complete; visual/device review pending |
| 14 | Peer Profile | Public profile uses a bounded detail list, 76-point quick-action tiles and 48-point photo-viewer close control. | Source pass complete; privacy and media acceptance pending |
| 15 | Edit Profile | Form uses keyboard-aware ScrollView with handled taps, profile/cover media upload, visibility controls, preview and explicit save state. | Source pass complete; upload and account-privacy acceptance pending |

These three profile surfaces remain separate: public identity, another person's public profile and private profile editing. Creator Studio and private analytics are not merged into the public profile.
