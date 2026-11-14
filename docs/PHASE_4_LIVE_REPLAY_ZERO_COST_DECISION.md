# Creator LIVE replay and recording — zero-cost decision

**Decision date:** 2026-11-14  
**Phase:** Phase 4 / issue #16  
**Current state:** A guarded server-side replay backend is merged and its private-storage migration is applied, but recording remains disabled. ZannyChat must not advertise hosted replay as available.

## What exists now

- A LiveKit Egress service integration with signed webhook handling.
- Creator-only start/stop/delete routes, privacy-filtered replay discovery and short-lived signed playback URLs.
- A private Supabase replay bucket, replay metadata, storage/monthly duration quotas, retention and cleanup worker.
- Feature gates that fail closed. Recording requires both LIVEKIT_REPLAY_ENABLED=true and LIVEKIT_REPLAY_BUILD_PLAN_CONFIRMED=true, plus valid Egress and storage credentials.

The backend foundation was merged in [backend PR #42](https://github.com/Zanny001/zannychat-backend/pull/42). Its additive migration was applied as Supabase version 20261114084400 and synchronised with the repository in [backend PR #46](https://github.com/Zanny001/zannychat-backend/pull/46).

**This is infrastructure code, not an enabled product feature.** No Egress credentials have been activated, no recording has been started, and no replay is currently available to creators or viewers.

## Why persistent replay is not enabled yet

LiveKit Egress is a separate service for self-hosted deployments. It requires Redis communication with the LiveKit server and recommends substantial compute resources. LiveKit Cloud provides managed Egress, but its availability and any included allowance must be confirmed against the actual account plan before use.

Supabase Free includes limited file storage and bandwidth. A single 60-minute recording at 1.5 Mbps is roughly 675 MB before container overhead and additional copies. A small number of recordings could exhaust included storage or bandwidth. The quota controls in the backend reduce risk, but they do not make Egress or storage free.

References:
- [LiveKit Egress service requirements](https://docs.livekit.io/transport/self-hosting/egress/)
- [Supabase Free plan quotas](https://supabase.com/pricing)
- [Supabase bandwidth and storage egress](https://supabase.com/docs/guides/storage/serving/bandwidth)

## Zero-cost release decision

1. **Phase 4 remains ephemeral LIVE by default.** Discovery, invitations, guest approval, reactions and notifications can work without recordings.
2. **Do not enable hosted recording under the ₦0 constraint** until the actual LiveKit plan, Egress allowance, storage capacity and bandwidth costs are verified. Do not set the feature gates or add Egress credentials as part of routine deployment.
3. **Future zero-cost recording path:** creator-initiated local recording/export, only after a tested implementation exists on web, Android and iOS. Local files remain under the creator's device control. A local-only recording is not described as a cross-device replay.
4. **Future hosted replay path:** only enable after verifying a no-cost Egress allowance can run reliably, then require private object storage, creator consent, audience authorization, hard storage/egress quotas, short retention, automatic deletion and a clear delete control.

## Acceptance status

- [x] Zero-cost-compatible replay decision documented.
- [x] Guarded backend replay lifecycle and private bucket migration merged/applied.
- [x] Recording remains disabled by default; no paid Egress or recording credentials have been activated.
- [ ] Verify an actual no-cost Egress plan/allowance and operational capacity before enabling.
- [ ] Build and validate creator-facing replay controls/discovery/playback UI if hosted replay becomes viable.
- [ ] Cross-platform creator-local recording/export and physical-device tests.

This is an explicit product boundary, not a claim that replay is already available.