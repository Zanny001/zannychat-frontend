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
| Frontend #88 — original stacked Creator Studio PR | Closed, not merged | Superseded by rebased PR #89; do not reopen. |
| Frontend #84 — direct-call LiveKit client | Open draft | Automated client checks were in progress on the latest observed run; physical-device/browser calling acceptance remains outstanding. |
| Frontend #102 — permanent message retry failures (rebased) | Open draft | API attempts same-ID recovery after SQLSTATE 23505. An earlier Premium workflow failed one stale source-contract assertion; corrected in commit b30c5ac, fresh CI result not yet observed. |
| Backend | No open PRs returned | Continue main-branch source, migration and production route audit. |

## Workstream A — LIVE

**Verified:** browser remote-track participant handling, server-issued creator/guest/viewer role authority, explicit subscription configuration, heartbeat lifecycle and end/leave confirmation changes are present in merged frontend #86. Backend main contains LIVE stream routes, token role enforcement, guest moderation, reporting, reaction and replay worker code. Supabase inventory shows LIVE tables protected by RLS with direct client access intentionally withheld.

**Not proven:** remote RTP audio/video delivery between independent accounts/devices; guest promotion/demotion across token renewal; camera/mic transitions; network loss recovery; end-to-end Egress recording, webhook finalization, private object upload, playback, expiry and deletion. Production previously had no replay rows/objects in the LIVE audit snapshot.

**Verified addition:** Creator Studio is already present in main through rebased PR #89; LIVE discovery improvements are present through #87. **Next:** verify creator-only Studio visibility, participant refresh lifecycle, host/guest labels and web/native moderator parity in runtime; complete browser two-account and Android two-device media acceptance; create and play one real test replay; verify viewer/guest/creator permissions and moderation.

## Workstream B — Calling

**Verified:** the frontend has a draft direct-call LiveKit migration (#84); backend package scripts include call signaling, group-call, conference upgrade, heartbeat lease, notification and cleanup tests. Existing direct WebRTC/TURN fallback is intended to remain during rollout.

**Not proven:** incoming/outgoing audio and video on physical Android/iOS devices; background/terminated incoming-call handling; speaker/Bluetooth route changes; camera/mic switching; reconnects; participant addition; direct-to-group promotion; CallKit/Android Telecom lifecycle and cleanup under process death.

**Next:** inspect client/server transport parity and fallback behavior; run browser plus two-device acceptance; verify notification delivery and native lifecycle; only then change production transport defaults.

## Workstream C — Messaging

**Verified:** rebased frontend #102 distinguishes permanent from transient send errors, preserves safe Postgres error codes/status, avoids queuing permanent failures, and removes permanently rejected items discovered by background retry. The send API reuses the request ID and attempts to recover the committed row after SQLSTATE 23505 before surfacing an error.

**CI finding:** an earlier Premium quality run failed one legacy source-contract assertion because the test expected a multi-line queue conditional while the implementation uses an inline queue update. The assertion was corrected in commit b30c5ac; a fresh workflow result is still required. PR #102 remains draft.

**Next:** audit send/delivery/read receipts, optimistic state, outbox and attachment retry, edits/deletes/replies/forwarding, drafts, offline sync, pagination, search, notification and multi-device consistency. Test network interruption, duplicate delivery and read-after-commit recovery.

## Workstream D — Security and privacy

**Production SQL inventory:** 67 public SECURITY DEFINER functions inspected. Zero have unpinned search_path, zero grant EXECUTE to PUBLIC, and zero grant EXECUTE to anon. Twenty-eight are executable by authenticated users; sampled bodies bind authorization to auth.uid(), conversation membership, ownership, visibility and/or block relationships. This is a positive baseline, not a complete penetration test.

**Advisor items:** leaked-password protection is disabled; enablement needs an Auth configuration change and confirmation that it is available in the current plan. Advisor reports for RLS-enabled tables without policies are consistent with backend-only tables where direct anon/authenticated grants are absent; do not add broad policies to silence the advisor. Review all authenticated SECURITY DEFINER functions individually and retain regression tests.

**Next:** inspect all RLS table grants and storage policies; verify signed URL expiry and object ownership; audit auth/session storage on web/native; inspect account deletion and cleanup; validate CORS allowlist and security headers; test rate limits, input validation, enumeration resistance, token revocation and privilege escalation. End-to-end encryption is not to be advertised unless implemented and verified.

## Workstream E — Premium interfaces (36-screen programme)

Design direction: Crown Aurora — deep navy/void surfaces, violet and cyan accents, restrained crown gold, moderate content/video containers, refined glass treatment, controlled motion, strong typography and accessible contrast. The foundation is merged through PR #91. Preserve working navigation, real data and service-backed actions. Reconcile the agreed 36-screen redesign against the repository's broader screen inventory; no screen is marked complete based on a mockup alone.

For each screen record: layout hierarchy, responsive breakpoints, tap-target sizes, text scaling, light/dark theme, loading/empty/error states, accessibility labels, data provenance, navigation, destructive confirmation, keyboard behavior and interaction tests.

## Workstream F — Performance and infrastructure

Audit cold start, bundle size, memory, battery, list virtualization, image/video memory, database indexes/query plans, realtime subscription cleanup, retry storms, Render worker health, Supabase storage growth, Vercel routing/build settings, dependency vulnerabilities and low-bandwidth behavior. Do not remove indexes solely because the current low-traffic advisor labels them unused.

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
