# ZannyChat Canonical Release

Canonical source package: 1.2.239

- Frontend source: `/root/zannychat-front`
- Backend Git repository: `/root/zannychat-back-github`
- Backend package version: `1.2.239`
- Frontend release readiness: blocked; 29/30 gates currently pass.
- Commit/push/deployment approval was given in the release session; execution remains subject to all release gates and verification. No production database migration is authorized.

## Current known validation

- Frontend unit tests: 442 passed, 0 failed (previously reported source test run; rerun before release).
- Frontend integrity tests: 13 passed (reported in the development session).
- Release contract audit: 4/4 checks passed (reported in the development session).
- Backend test audit: 34/34 test scripts passed (reported in the development session).
- Current release readiness audit: 29/30 gates passed; native WebRTC validation remains blocked. See `RELEASE_VALIDATION_1.2.239.md`.

## Outstanding release requirements

- Clean Android and iOS native builds for the current SDK/dependency set.
- Real-device audio/video call smoke tests, including permissions, connection setup, termination, and recovery.
- Explicit review and documentation of background-call limitations.
- Final release readiness audit with all required gates satisfied.

A passing static audit or the presence of documentation does not substitute for native build or device-test evidence.
