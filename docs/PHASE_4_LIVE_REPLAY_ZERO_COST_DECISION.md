# Creator LIVE replay — zero-cost design and production readiness

**Last audited:** 2026-11-16  
**Budget constraint:** ₦0; no paid Egress, storage, or hosting is approved.  
**Production result:** The replay backend, quota ledger, private bucket, creator controls and player exist in source and the database migration is applied. However, the production database and Storage bucket contained **zero replay rows and zero replay objects** at the latest read-only audit. A successful end-to-end recording/playback has therefore not been demonstrated.

## 1. Verified free-tier limits

The official plan pages currently list:

### LiveKit Cloud Build

- 60 transcode minutes per month for composite Egress.
- Two concurrent Egress requests.
- File output maximum of three hours.
- Build plan quotas are hard limits; do not assume paid overage or silently upgrade.

Official reference: [LiveKit quotas and limits](https://docs.livekit.io/deploy/admin/quotas-and-limits/).

### Supabase Free

- 1 GB Storage.
- 5 GB cached egress and 5 GB uncached egress (shared across database, Storage and other project traffic).
- 50 MB maximum global upload size.

Official references: [Supabase pricing](https://supabase.com/pricing), [Storage upload limits](https://supabase.com/docs/guides/storage/uploads/file-limits), [Storage egress](https://supabase.com/docs/guides/storage/serving/bandwidth).

These are published plan allowances, not confirmation that the existing ZannyChat LiveKit and Supabase organizations are currently on those plans or have unused quota. Verify the actual account tier and remaining monthly usage before enabling recording.

## 2. Limits enforced in the current backend

The current backend source implements stricter application caps than the published platform limits:

| Control | Enforced application limit |
|---|---:|
| Maximum recording duration | 300 seconds (5 minutes) |
| Egress output duration tolerance | 305 seconds |
| Monthly transcode quota | 3,000 seconds (50 minutes) |
| Concurrent recordings | One globally active reservation |
| Maximum MP4 object | 48,000,000 bytes |
| Total replay storage ceiling | 700,000,000 bytes |
| Replay retention | 7 days |
| Signed playback URL | 360 seconds |
| Replay bucket | Private; MP4 only |

Implementation references:
- `backend/src/services/livekitEgress.js`: 300-second duration and 48 MB object limits, 360p composite settings and replay feature gate.
- `backend/src/routes/liveStreams.js`: creator-only start, storage headroom check and quota reservation.
- `backend/src/routes/liveHistory.js`: playback authorization, signed URLs and owner deletion.
- `backend/src/jobs/liveReplayWorker.js`: automatic stop, restart recovery and seven-day retention cleanup.
- `backend/supabase/migrations/20261114084400_live_replay_storage_quota.sql`: service-role-only metadata/quota tables, quota functions and private bucket.

The database migration is already applied in the live project and present in backend `main`; do not reapply it. The private `live-replays` bucket is configured for MP4 with a 48,000,000-byte file limit. Direct client table access is revoked; the backend uses service-role access.

## 3. Feature gate and safety behavior

The backend only enables recording when all of the following are true:

- `LIVEKIT_REPLAY_ENABLED=true`.
- `LIVEKIT_REPLAY_BUILD_PLAN_CONFIRMED=true`.
- Valid dedicated Egress credentials and webhook configuration are available.
- Private Supabase S3 storage configuration is valid.
- Monthly quota and storage headroom can be reserved.

The actual Render environment values and remaining LiveKit monthly usage were not inspected during this audit. Do not infer that the feature is enabled merely because the code and credentials exist. If the existing account tier or quota cannot be confirmed, keep `LIVEKIT_REPLAY_ENABLED=false`.

The backend must fail closed: no public-bucket fallback, no client-side S3 credentials, no recording when quota cannot be reserved, and no playback URL without checking the original stream audience, invite/follow rules, moderation and bidirectional block rules.

## 4. Current frontend implementation

- `LiveStreamScreen.js` contains creator-only record/start/stop controls, status refresh and the five-minute warning. The control is shown only when the backend reports replay enabled and the authenticated session has creator permissions.
- `LiveReplayScreen.js` requests a short-lived server-signed playback URL and exposes owner-only deletion.
- LIVE PR #86 merged the media/role reliability baseline; PR #89 merged Creator Studio and host/guest role hierarchy. These changes do not constitute replay Egress acceptance.
- Guest/viewer clients must never inherit the creator's recording controls. Server-issued roles, not route parameters, are authoritative.

## 5. Production evidence and unresolved gates

Latest read-only production inspection found:
- `live_stream_replays`: zero rows.
- `live-replays` Storage bucket: private, zero objects.
- The database migration and quota ledger are present.

This proves the private bucket and replay metadata structure exist; it does **not** prove that Egress can start, the webhook can validate, an MP4 can upload, the row can reach `ready`, or an eligible viewer can play it.

Required acceptance sequence:

1. Confirm the existing LiveKit project is on the Build plan and inspect remaining transcode minutes for the current month.
2. Confirm the existing Supabase project tier and current Storage/egress usage; reserve the app's 700 MB replay ceiling only if the remaining storage is sufficient.
3. Verify Render feature flags and dedicated Egress/S3/webhook configuration without copying secrets into chat, GitHub or logs. Keep recording disabled until all values and plan checks are verified.
4. On a real creator account, start a recording and verify one active reservation, 5-minute automatic stop and creator-only control visibility.
5. Verify Egress completion webhook signature, duration/size validation, private MP4 upload, quota finalization and replay status transition to `ready`.
6. Verify signed playback for an eligible viewer and denial for non-followers, non-invited private viewers, blocked users and users denied by moderation.
7. Verify owner deletion removes the private object and finalizes quota; verify failed/incomplete Egress recovery and seven-day retention cleanup.
8. Repeat with two browser accounts and physical Android devices; confirm guests and viewers never receive creator recording controls.

## 6. Cost decision

A limited pilot is technically compatible with the published free quotas **only if** the existing projects are actually on the stated free tiers and have sufficient remaining monthly allowance. The application reserves 10 transcode minutes below LiveKit's published 60-minute allowance and caps object size/storage below Supabase's published limits.

No paid service or extra infrastructure is required by the design. Do not increase limits, turn on paid overage, upgrade plans or start additional Egress workers to make a test pass. If quotas are exhausted or uncertain, leave replay disabled and continue with the rest of the app audit.

---
**Status:** Implementation exists; production Egress-to-playback acceptance is still open. No claim of successful production replay is made.
