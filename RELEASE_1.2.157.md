# ZannyChat 1.2.157

## Focus
Message outbox recovery and duplicate-send prevention at the persisted-queue normalization boundary.

## Changes
- Deduplicate persisted pending messages by `requestId`.
- Retain the latest valid duplicate and move it to the latest FIFO position.
- Preserve a valid queue item when a later duplicate is malformed.
- Add regression tests for duplicate IDs and invalid duplicates.
- Bump frontend package and Expo app version to 1.2.157.

## Validation
Automated unit tests and the static release audit are run for this source package. This release is not a production deployment. Production build, device verification, live integration, and server-side idempotency verification remain separate requirements.
