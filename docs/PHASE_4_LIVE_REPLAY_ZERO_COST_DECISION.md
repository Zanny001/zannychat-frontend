# Creator LIVE replay — zero-cost implementation design

**Decision date:** 2026-11-14  
**Phase:** Phase 4 / issue #16  
**Current state:** No recording or replay is enabled in production. The following is the approved zero-cost design candidate; it is not yet implemented or enabled.

## A viable free-tier path exists, with strict caps

LiveKit Cloud Build includes managed Egress without a separate self-hosted worker. Its published free allowance includes **60 transcode minutes/month**, **2 concurrent Egress requests**, and a hard cap: once the allowance is exhausted, new requests fail rather than generating overage. File outputs have a 3-hour platform maximum, so ZannyChat must impose a much smaller application limit.

Supabase Free currently includes **1 GB Storage**, **5 GB cached egress**, **5 GB uncached egress**, and a **50 MB maximum file upload**. Those quotas are shared with all existing app media and traffic, so the full quota cannot be reserved for replays.

References:
- [LiveKit Cloud Egress is managed](https://docs.livekit.io/transport/self-hosting/egress/)
- [LiveKit Build plan quotas and hard caps](https://docs.livekit.io/deploy/admin/quotas-and-limits/)
- [Supabase Free plan quotas](https://supabase.com/pricing)
- [Supabase storage S3 authentication](https://supabase.com/docs/guides/storage/s3/authentication)

## Proposed replay limits

Only enable this feature after confirming the existing LiveKit project is on the free Build plan and has enough remaining monthly transcode allowance.

- Creator-initiated only; no automatic recording.
- One active recording globally; never use the second Build-plan Egress slot.
- Maximum 5 minutes per replay.
- Application quota: maximum 50 transcode minutes per calendar month, leaving 10 minutes of margin below the published 60-minute allowance.
- 360p/30fps low-bitrate composite output; target below 30 MB and reject/clean up any object over 50 MB.
- Private Supabase Storage bucket; no public object URLs.
- Maximum 700 MB of replay objects, preserving at least 300 MB of the Free plan's 1 GB storage for avatars, chat media and statuses.
- Seven-day retention with automatic deletion and an owner delete control.
- Signed playback URLs issued only after checking the viewer against the original stream's visibility, follow, invite and block rules.
- Fail closed when plan/credentials are missing, quota is exhausted, storage headroom is insufficient, or Egress returns a limit error. Never fall back to a public bucket.

## Required implementation

1. Add a live_stream_replays metadata table and a monthly quota reservation ledger with transaction-safe locking.
2. Add creator-only start/stop endpoints using the existing LiveKit server credentials and the roomRecord permission.
3. Use LiveKit Cloud Egress MP4 output to Supabase Storage's S3-compatible endpoint. Supabase S3 access keys bypass Storage RLS, so they must exist only in backend secrets and never in the app.
4. Add a signed LiveKit Egress webhook to mark recordings ready/failed and reconcile the final duration and file size.
5. Add a reliable stop-expiry mechanism; do not depend solely on a mobile timer or an in-memory Node timer.
6. Create the private bucket and storage policies, signed playback route, quota/retention cleanup, and creator/viewer UI.
7. Verify the LiveKit project plan and remaining quota, Supabase plan and actual storage headroom, then test start/stop/failure/limit cases before enabling the feature.

If the existing LiveKit project is self-hosted rather than LiveKit Cloud, Egress must be deployed separately; LiveKit recommends at least 4 CPUs and 4 GB RAM per Egress instance. That is not assumed to be free on the current hosting.

## Acceptance status

- [x] Zero-cost design grounded in current LiveKit and Supabase free-tier limits.
- [x] No paid infrastructure or recording has been enabled.
- [ ] Confirm the existing LiveKit project is on Build and check its remaining transcode allowance.
- [ ] Configure Supabase S3 protocol credentials as backend-only Render secrets.
- [ ] Implement the replay lifecycle, quota enforcement, webhook, private playback and retention.
- [ ] Run two-account authorization tests and physical-device playback tests.

This design makes a small replay pilot plausible at ₦0 if the existing projects are on the documented free tiers. It does not claim replay is available today.
