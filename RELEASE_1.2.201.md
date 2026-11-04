# ZannyChat frontend release 1.2.201

## Changes
- Hardened message and attachment retry diagnostics so raw provider/database error messages are not written to local retry queues or displayed in the pending-attachment UI.
- Added a shared safe retry-error mapper for permission, stale-reference, invalid-data, network, and unknown failures.
- Sanitizes legacy persisted outbox error strings when normalizing queued messages and attachments, preventing old raw diagnostics from continuing to surface after upgrade.
- Preserved retry timing, queue identifiers, attempt counts, and queue recovery behavior.

## Validation
- Frontend unit tests: 354 passed, 0 failed.
- Backend tests: 173 passed, 0 failed (backend unchanged).
- Frontend release audit: 12/12 passed.
- `package.json`, `package-lock.json`, and `app.json` versions agree at 1.2.201.

## Limitations
- No production deployment, Expo production build, physical-device validation, or live end-to-end send/upload test was performed.
