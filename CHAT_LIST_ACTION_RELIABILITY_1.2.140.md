# ZannyChat 1.2.140 — Chat-list action reliability

- Favorite, mute, and archive actions still update optimistically for a responsive feel.
- Failed writes now roll back the affected field rather than silently leaving stale UI state.
- Per-conversation/per-field pending locks prevent repeated rapid taps from issuing overlapping contradictory writes.
- Failures are surfaced in an accessible, dismissible inline alert.

Validation: run `npm run test:unit` and `npm run audit:release`. This source-only pass does not claim production deployment or device-level validation.
