# ZannyChat frontend 1.2.54 / backend 1.2.8 — Status view receipts

- Adds `0023_status_view_receipts.sql` with one receipt per status/viewer, RLS that limits receipt reads to the status author, and self-only insert checks for active statuses visible through the existing status policies.
- The status list records a view when an eligible non-owner status appears in the active-status list. The author's own status cards show an aggregate view count.
- Duplicate receipts on refresh are ignored. Receipt recording failures are non-blocking and logged; counts may therefore lag if policy/network failures occur.
- This is not an exact impression metric: statuses are counted as viewed when returned in the status list, not after a dedicated full-screen story viewer is opened. Viewer identities are not exposed in this increment.
- Apply migration `0023_status_view_receipts.sql` after `0022_status_media.sql`. No production migration, deployment, hosted RLS test, Expo build, or device test was performed.
