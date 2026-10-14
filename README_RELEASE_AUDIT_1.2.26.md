# ZannyChat 1.2.26 — Frontend reproducibility audit

## What changed

- Added `scripts/audit_frontend_release.py`, a dependency-free audit of the frontend dependency manifest, lockfile presence, frozen-install CI configuration, and pull-request CI trigger.
- Added regression tests for the audit's passing and blocking cases.
- Exposed the audit through `npm run audit:release` from the frontend directory.
- Bumped frontend and Expo metadata to 1.2.26.

## Why this matters

The frontend manifest currently uses `latest` for multiple packages and has no checked-in npm lockfile. The CI workflow currently runs `npm install`, which can resolve different package versions over time. The new audit reports these as release blockers instead of implying builds are reproducible.

## Validation limits

The audit intentionally fails while these reproducibility blockers remain. This release does not silently rewrite dependency versions to guesses: versions should be pinned against a compatible Expo SDK matrix, then a lockfile generated with a working package registry and a clean install/export verified. Native Android/iOS builds, backend Jest, live Supabase integration, and production deployment remain unverified.
