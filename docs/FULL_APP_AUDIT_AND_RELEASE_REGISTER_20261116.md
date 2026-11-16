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
- No production schema changes were made during this audit pass.

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
| Frontend #84 — direct-call LiveKit client | Open draft | Both frontend quality workflows passed on head `a426127`; Netlify preview succeeded. Late-token/end-call race protection is included. Physical-device/browser calling acceptance remains outstanding. |
| Frontend #100 — chat history recovery | Merged | Initial and older-history failures now show accessible loading/error/empty states and retry actions. Both frontend quality workflows and Netlify preview passed. |
| Frontend #102 — permanent message retry failures (rebased) | Merged | SQLSTATE/error codes survive safe error mapping; permission, stale-reference, validation and auth failures are not queued/retried indefinitely. Both frontend quality workflows and Netlify preview passed. |
| Frontend #104 — member-favorites account cleanup | Merged | Permanent account deletion now clears only the deleted account's local directory favorites. Both frontend quality workflows and Netlify preview passed. |
| Backend #121/#122/#124 — superseded message guard attempts | Closed | Superseded by the corrected, merged backend PR #126. |\n| Backend #126 — message insert integrity | Merged | Production migration applied as Supabase version 20261116195405; repository filename aligned in backend PR #127. Rollback-only production smoke tests passed and left no test rows. |

## Navigation inventory reconciliation

The previously agreed ordered inventory is: Onboarding, Login, Signup, VerifyEmail, PasswordRecovery, PasswordReset, Main, Chats, Chat, NewChat, ForwardMessage, SavedMessages, Drafts, PinnedMessages, ChatFolders, SharedMedia, ChatAppearance, PeerProfile, QRContact, ContactDiscovery, CreateGroup, GroupManagement, JoinGroup, Channels, Polls, Events, Calls, IncomingCall, OutgoingCall, Call, GroupCall, LiveHub, LiveStream, Updates, Profile, EditProfile, Settings, PrivacySecurity, Notifications, DataStorage, DataExport, Sessions, Help.

Five experiences were added in the current navigator and must also be audited: LiveReplay, LiveCreatorProfile, ScheduledMessages, LIVE (tab), and StatusUpdates. The shared Channels route is counted once. The 43 + 5 = 48 total is the canonical current audit scope.

## Workstream A — LIVE

**Verified:** browser remote-track participant handling, server-issued creator/guest/viewer role authority, explicit subscription configuration, heartbeat lifecycle and end/leave confirmation changes are present in merged frontend #86. Backend main contains LIVE stream routes, token role enforcement, guest moderation, reporting, reaction and replay worker code. Supabase inventory shows LIVE tables protected by RLS with direct client access intentionally withheld.

**Not proven:** remote RTP audio/video delivery between independent accounts/devices; guest promotion/demotion across token renewal; camera/mic transitions; network loss recovery; end-to-end Egress recording, webhook finalization, private object upload, playback, expiry and deletion. The current production snapshot has 0 replay rows and 0 objects in the private `live-replays` bucket; replay E2E is therefore not proven.

**Verified addition:** Creator Studio is already present in main through rebased PR #89; LIVE discovery improvements are present through #87. **Next:** verify creator-only Studio visibility, participant refresh lifecycle, host/guest labels and web/native moderator parity in runtime; complete browser two-account and Android two-device media acceptance; create and play one real test replay; verify viewer/guest/creator permissions and moderation.

## Workstream B — Calling

**Verified:** the frontend has a draft direct-call LiveKit migration (#84); backend package scripts include call signaling, group-call, conference upgrade, heartbeat lease, notification and cleanup tests. Existing direct WebRTC/TURN fallback is intended to remain during rollout.

**Not proven:** incoming/outgoing audio and video on physical Android/iOS devices; background/terminated incoming-call handling; speaker/Bluetooth route changes; camera/mic switching; reconnects; participant addition; direct-to-group promotion; CallKit/Android Telecom lifecycle and cleanup under process death.

**Next:** inspect client/server transport parity and fallback behavior; run browser plus two-device acceptance; verify notification delivery and native lifecycle; only then change production transport defaults.

## Workstream C — Messaging

**Verified:** rebased frontend #102 distinguishes permanent from transient send errors, preserves safe Postgres error codes/status, avoids queuing permanent failures, and removes permanently rejected items discovered by background retry. The send API reuses the request ID and attempts to recover the committed row after SQLSTATE 23505 before surfacing an error.

**CI result:** frontend PR #102 is merged. The final Premium status/LIVE quality and Advanced calling client workflows both passed on the exact final head, and the Netlify deploy preview succeeded. The Vercel check was blocked by the team build-rate-limit at that point.

**Next:** audit send/delivery/read receipts, optimistic state, outbox and attachment retry, edits/deletes/replies/forwarding, drafts, offline sync, pagination, search, notification and multi-device consistency. Test network interruption, duplicate delivery and read-after-commit recovery.

## Workstream D — Security and privacy

**Production SQL inventory:** 67 public SECURITY DEFINER functions inspected. Zero have unpinned search_path, zero grant EXECUTE to PUBLIC, and zero grant EXECUTE to anon. Twenty-eight are executable by authenticated users; sampled bodies bind authorization to auth.uid(), conversation membership, ownership, visibility and/or block relationships. This is a positive baseline, not a complete penetration test.

**Applied P1 fix:** backend PR #126 added `private.guard_message_insert_integrity()` as an invoker-only BEFORE INSERT trigger on `public.messages`. It server-stamps creation metadata, clears client-supplied edit/retraction fields, binds replies to the same conversation while preserving replies to deleted tombstones, and verifies chat-media object ownership/path. Supabase recorded version `20261116195405`; backend PR #127 aligned the repository filename. Transactional smoke checks covered forged sender, timestamp override, cross-conversation reply and valid attachment. All test inserts were rolled back; no rows persisted.

**RLS and storage inventory:** sampled live catalog shows RLS enabled on the audited public tables; zero anon table privileges were found. Twenty-six RLS-protected tables grant at least one direct operation to authenticated users, with policies scoped to ownership, conversation membership, participant identity or eligible status audience. Call-session UPDATE has broad column grants, but its SECURITY DEFINER trigger validates immutable identity fields and enforces the call state machine. Five storage buckets exist: only `avatars` is public; `chat-media`, `status-media`, `live-replays` and `private-avatars` are private. The three remaining objects in `avatars` were mapped to profiles whose profile and photo visibility are both `everyone`; privacy transition triggers reject direct visibility changes unless public avatar URLs and objects have first been removed. LIVE replay objects have no direct client storage policies, consistent with service-role-only upload/playback signing. Storage policy definitions for chat media, private avatars and status media include conversation membership, owner path and audience authorization checks.

**Advisor items:** leaked-password protection is disabled; enablement needs an Auth configuration change and confirmation that it is available in the current plan. The advisor currently reports 37 RLS-enabled tables without policies; catalog review shows these are backend/service-role-only tables with no anon table privileges, so do not add broad policies to silence the advisor. Review all authenticated SECURITY DEFINER functions individually and retain regression tests.

**Additional P2 integrity hardening:** authenticated users can set their own `message_delivery_receipts.delivered_at`, `status_views.viewed_at`, `status_reactions.created_at/updated_at` and `conversation_participants.last_read_at` within existing RLS boundaries. These are self-attributable rows, not cross-user write access, but client-supplied future/forged timestamps can distort delivery, read and status analytics. Add server timestamp/monotonicity triggers with focused tests after the P0 message INSERT fix.

**Next:** inspect all RLS table grants and storage policies; verify signed URL expiry and object ownership; audit auth/session storage on web/native; inspect account deletion and cleanup; validate CORS allowlist and security headers; test rate limits, input validation, enumeration resistance, token revocation and privilege escalation. End-to-end encryption is not to be advertised unless implemented and verified.

## Workstream E — Premium interfaces (36-screen programme)

Design direction: Crown Aurora — deep navy/void surfaces, violet and cyan accents, restrained crown gold, moderate content/video containers, refined glass treatment, controlled motion, strong typography and accessible contrast. The foundation is merged through PR #91. Preserve working navigation, real data and service-backed actions. Reconcile the agreed 36-screen redesign against the repository's broader screen inventory; no screen is marked complete based on a mockup alone.

For each screen record: layout hierarchy, responsive breakpoints, tap-target sizes, text scaling, light/dark theme, loading/empty/error states, accessibility labels, data provenance, navigation, destructive confirmation, keyboard behavior and interaction tests.

## Workstream F — Performance and infrastructure

Audit cold start, bundle size, memory, battery, list virtualization, image/video memory, database indexes/query plans, realtime subscription cleanup, retry storms, Render worker health, Supabase storage growth, Vercel routing/build settings, dependency vulnerabilities and low-bandwidth behavior. Do not remove indexes solely because the current low-traffic advisor labels them unused. Supabase currently reports 62 unused indexes; this is low-traffic evidence, not a reason for blind index removal.

**Production checks:** Render backend latest deployment for CORS-origin diagnostics is live. Backend CORS allowlist already includes `https://zannychat.vercel.app` and the primary Netlify origin. The diagnostic logger was deployed without broadening the allowlist; no new 403 CORS request logs appeared in the first queried minute after deployment. No 5xx request logs were returned in the queried window.

**Vercel blocker:** the team/domain can be read, but project creation returned HTTP 403. No Vercel project or deployment was created. The `zannychat.vercel.app` project must be created after the connected integration receives project-write permission. The verified `zannychat.com` domain currently has no project attached and no verified nameserver configuration.

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


## Reconciled completion checkpoint — 2026-11-16 20:00 UTC

- Frontend PR #93 (account-scoped Status drafts and local outbox cleanup), #98 (Saved Messages and Chat Folders deletion cleanup), #99 (Chat Folders recovery), #100 (Chat history recovery), #102 (permanent message-send failure classification), and #104 (member-directory favorites cleanup) are now merged to `main`.
- Final frontend CI passed on the exact heads for #100, #102 and #104; each has a successful Netlify deploy preview. The Vercel integration has since produced a successful preview check on the documentation register PR, but the team-scoped project-management API still requires the owner to approve a one-time Vercel team authorization request before project settings/deployments can be inspected.
- PR #84 remains a draft. Its direct-call LiveKit migration and late-token/end-call race protection passed both frontend workflows and Netlify preview; physical Android/iOS/browser acceptance is still a mandatory release gate.
- Current main has the ChatScreen initial-history and older-page retry states. Messaging source audit also found and fixed a permanent-failure outbox loop; no claim is made that cross-device message sync or E2EE exists.
- Account deletion cleanup now covers message drafts, pins, text and attachment retry queues, Status drafts, Channel drafts/recent-channel IDs, Saved Messages, Chat Folders and member-directory favorites. Notification/media/theme preferences remain device-level preferences, not account content.
- Production Supabase catalog recheck: 67 public SECURITY DEFINER functions; 0 executable by PUBLIC, 0 by anon, 28 by authenticated; 0 without pinned search_path. 37 RLS-enabled public tables without policies have 0 anon/authenticated table privileges. Storage currently has five buckets (one public legacy avatars bucket, four private buckets); all three remaining public avatar objects currently map to profiles whose profile and photo visibility are both everyone. Profile visibility transition triggers protect against direct client-side bypass by requiring public URLs/objects to be removed before a restrictive visibility setting is accepted.
- No production Vercel deployment, native release build, physical-device acceptance, or real LIVE replay Egress cycle is certified by this documentation update.
