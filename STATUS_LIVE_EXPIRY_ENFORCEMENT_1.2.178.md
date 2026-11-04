# ZannyChat 1.2.178 — live Status expiry enforcement

- Added a shared expiry predicate that fails closed for missing or malformed `expires_at` values.
- Re-prunes the already-loaded Status feed every 15 seconds so entries disappear after expiry without requiring navigation or a manual refresh.
- Closes the currently viewed Status when its expiry is reached.
- Rejects attempts to open stale Status entries and directs the user to refresh the feed.
- Added deterministic regression tests for active, expired, boundary, malformed, and non-array input cases.

Validation: frontend unit tests and release audit results are recorded in the release response. This is a source-only change; server-side RLS and live deployment remain separate requirements.
