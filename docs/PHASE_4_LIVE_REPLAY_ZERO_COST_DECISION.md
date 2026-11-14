# Creator LIVE replay and recording — zero-cost decision

**Decision date:** 2026-11-14  
**Phase:** Phase 4 / issue #16  
**Current state:** Server-side replay is not implemented and must not be advertised as available.

## Why persistent replay is not enabled yet

The current ZannyChat LIVE integration creates LiveKit rooms and participant tokens. The production backend does not currently operate a LiveKit Egress worker, a recording job lifecycle, replay metadata, a private replay bucket, or retention/cleanup jobs.

LiveKit documents Egress as a separate service for self-hosted deployments. It requires Redis communication with the LiveKit server and recommends at least 4 CPUs and 4 GB RAM for an Egress instance. LiveKit Cloud provides Egress as a managed feature, but it is not an infrastructure assumption for a strictly ₦0 release.

Supabase Free includes 1 GB of file storage and limited cached/uncached egress. A single 60-minute recording at 1.5 Mbps is roughly 675 MB before container overhead and additional copies. A handful of recordings could exhaust the included storage or bandwidth, so a public or automatic replay archive is not safe to enable without quotas and measured capacity.

References:
- [LiveKit Egress service requirements](https://docs.livekit.io/transport/self-hosting/egress/)
- [Supabase Free plan quotas](https://supabase.com/pricing)
- [Supabase bandwidth and storage egress](https://supabase.com/docs/guides/storage/serving/bandwidth)

## Zero-cost release decision

1. **Phase 4 ships ephemeral LIVE only.** Streams, creator discovery, invitations, guest approval and notifications can work without recordings.
2. **No automatic server-side recording or persistent replay archive.** Do not create Egress jobs, public video URLs, or background recording by default.
3. **Future zero-cost recording path:** creator-initiated local recording/export, only after a tested implementation exists on web, Android and iOS. Local files remain under the creator's device control. A local-only recording is not described as a cross-device replay.
4. **Future hosted replay path:** only enable after verifying a no-cost Egress worker can run reliably alongside the current LiveKit deployment, then use private object storage, creator consent, audience authorization, a hard storage/egress quota, short retention, automatic deletion, and a clear delete control. Stop recording before any free quota is exceeded.

## Acceptance status

- [x] Zero-cost-compatible replay strategy decided and documented.
- [x] No paid Egress or recording infrastructure introduced.
- [ ] Cross-platform creator local-recording/export implementation and physical-device tests.
- [ ] Server-hosted replay remains deferred until the infrastructure and quota gates above can be met.

This is an explicit product boundary, not a claim that replay is already available.
