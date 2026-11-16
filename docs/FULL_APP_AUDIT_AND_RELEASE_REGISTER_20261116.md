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
- Vercel still has zero linked projects in the connected team context. Its GitHub check reports `build-rate-limit`; no Vercel deployment or project is claimed. The team owner must approve the current one-time authorization request before project creation can be retried.
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

The current replay budget is five minutes per recording, 50 minutes total per calendar month, one globally active replay at a time, 48 MB per file and seven-day retention. The production Render feature flags and Egress/webhook runtime logs were not re-verified in this pass. A P2 reliability risk remains: ambiguous-start recovery lists active Egress only, so a completed Egress whose ID was not persisted and whose webhook delivery was lost may be marked failed after the grace period. Real production Egress-to-object-to-signed-playback acceptance remains open.
