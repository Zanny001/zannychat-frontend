# Status expiry cleanup reliability — 1.2.126

## Changes
- Expired status cleanup now processes bounded batches (up to 1,000 rows per app visit) instead of only the first 100 rows.
- Media objects are removed before their expired database rows. If storage removal fails, the row remains so a later visit can retry instead of orphaning media after row deletion.
- If row deletion fails after media removal, the expired row remains hidden by expiry filtering and cleanup can safely retry.
- Cleanup is scoped to the signed-in owner's rows and emits non-sensitive warning messages on failure.
- Added regression cases for owner scoping and storage-path selection.

## Validation
- Source-only change; no production database or storage was modified.
