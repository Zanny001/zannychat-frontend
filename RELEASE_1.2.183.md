# ZannyChat frontend release 1.2.183

## Improvements
- Added a bounded configurable batch size for the scheduled-message delivery worker (`SCHEDULED_MESSAGES_BATCH_SIZE`).
- Preserved a safe default of 100 and capped accepted overrides at 500 to avoid unbounded worker invocations.
- Added tests for defaulting, valid integer overrides, malformed values, and boundary conditions.
- Bumped frontend release metadata to 1.2.183.

## Verification
Run frontend utility tests and release audit, plus backend scheduled-worker and scheduled-message migration tests. This source package is not a live deployment; production worker configuration must be applied separately.
