# Creator LIVE replay — zero-cost implementation design

**Decision date:** 2026-11-14  
**Phase:** Phase 4 / issue #16  
**Production state:** Replay is not enabled and no recording has been started. Backend implementation is in frontend-independent backend PR #42; the database migration is not yet applied, and the creator/viewer UI and device tests remain outstanding.

## A viable free-tier path exists, with strict caps

LiveKit Cloud Build includes managed Egress without a separate self-hosted worker. Its published free allowance includes **60 transcode minutes/month**, **2 concurrent Egress requests**, and a hard cap: once the allowance is exhausted, new requests fail rather than generating overage. File outputs have a 3-hour platform maximum, so ZannyChat imposes a much smaller application limit.

Supabase Free currently includes **1 GB Storage**, **5 GB cached egress**, **5 GB uncached egress**, and a **50 MB maximum file upload**. Those quotas are shared with all existing app media and traffic, so the full quota cannot be reserved for replays.

References:
- [LiveKit Cloud Egress and recording](https://docs.livekit.io/transport/media/ingress-egress/egress/)
- [LiveKit Build plan quotas and hard caps](https://docs.livekit.io/deploy/admin/quotas-and-limits/)
- [Supabase Free plan quotas](https://supabase.com/pricing)
- [Supabase Storage S3 authentication](https://supabase.com/docs/guides/storage/s3/authentication)

## Enforced replay limits

The backend implementation in PR #42 applies these limits and keeps recording disabled by default:

- Creator-initiated only; no automatic recording.
- One active recording globally.
- Five-minute automatic stop, with startup recovery and periodic recovery scans.
- Application quota: maximum **50 transcode minutes per calendar month**, leaving 10 minutes below the published 60-minute Build allowance.
- 360p/24fps low-bitrate composite MP4; target below 30 MB and a **48,000,000-byte application ceiling** (below Supabase's 50 MB limit).
- Private Supabase Storage bucket; no public object URLs or direct client bucket access.
- Maximum **700,000,000 bytes** of replay objects, preserving at least 300 MB of the Free plan's 1 GB storage for avatars, chat media and statuses.
- Seven-day retention with automatic deletion and creator deletion.
- Signed playback URLs issued only after checking the viewer against the original stream's visibility, follow, invite, moderation and bidirectional block rules.
- Fail closed when the free-plan confirmation, credentials, quota, storage headroom or Egress request is missing/invalid. Never fall back to a public bucket.

## Backend implementation status — PR #42

The open backend PR adds:
- Private replay metadata and a transaction-safe monthly quota ledger.
- A private Storage bucket with a 48 MB upload ceiling and a server-only storage-usage RPC.
- Creator-only start/stop/delete routes and privacy-filtered discovery/playback routes.
- A dedicated LiveKit Egress API key with Admin role and the room-record grant; Egress output goes directly to Supabase S3.
- Per-request signed Egress completion webhook, raw-body signature verification, room-based recovery and idempotent quota finalization.
- Five-minute stop timer, restart recovery, periodic Egress lookup, and seven-day retention cleanup.
- Tests for migration grants, private bucket settings, Egress token/webhook validation, route authorization and recovery.

The PR is not merged yet. The migration has not been applied to production. The frontend controls and player are not complete.

## Required Render environment configuration

Do not send secrets in chat or commit them to GitHub. Add them only as Render service secrets after verifying the existing account tiers:

- LIVEKIT_REPLAY_ENABLED=true — keep false until all acceptance gates pass.
- LIVEKIT_REPLAY_BUILD_PLAN_CONFIRMED=true — only after confirming the existing LiveKit project is on Build and checking remaining monthly Egress allowance.
- LIVEKIT_EGRESS_API_KEY and LIVEKIT_EGRESS_API_SECRET — a dedicated LiveKit Cloud API key with **Admin** role, used only by the backend.
- LIVEKIT_REPLAY_WEBHOOK_URL=https://zannychat-backend-1.onrender.com/webhooks/livekit/egress
- SUPABASE_STORAGE_S3_ENDPOINT=https://vithpppgyjmazxvogvno.storage.supabase.co/storage/v1/s3
- SUPABASE_STORAGE_S3_ACCESS_KEY_ID and SUPABASE_STORAGE_S3_SECRET_ACCESS_KEY — Supabase Storage S3 credentials.
- SUPABASE_STORAGE_S3_REGION — the actual region shown in the Supabase project settings.

Supabase S3 credentials bypass Storage RLS and are full-access credentials. Keep them server-side in Render only. Do not place them in the app, GitHub, logs or user-visible responses. The existing LiveKit project URL and existing token credentials remain separate from the dedicated Admin Egress credentials.

## Remaining acceptance gates

- [x] Zero-cost design grounded in current LiveKit and Supabase free-tier limits.
- [x] Backend implementation and automated security/quota contracts drafted in PR #42.
- [x] No paid infrastructure or production recording enabled.
- [ ] Pass the latest backend CI on the final PR #42 head and merge it.
- [ ] Apply and verify the additive Supabase migration; verify the bucket remains private and direct authenticated access is denied.
- [ ] Confirm the existing LiveKit project is on Build and check its remaining transcode allowance.
- [ ] Configure the backend-only Render secrets listed above; keep replay disabled until configuration is verified.
- [ ] Build the creator recording controls, replay discovery cards and in-app player.
- [ ] Run two-account visibility/block/invite tests, start/stop/failure/quota/retention tests and physical-device playback tests.
- [ ] Enable replay only after all gates pass.

If the existing LiveKit project is self-hosted rather than LiveKit Cloud, Egress must be deployed separately; that is not assumed to be free on the current hosting.

This is a feasible ₦0 pilot design, not a claim that creator replay is available today.
