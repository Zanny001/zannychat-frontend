# Status expiry-aware navigation — 1.2.180

- Story navigation now filters the loaded feed by a valid, future `expires_at` timestamp before selecting adjacent items.
- Both owner-chronological navigation and global-feed fallback skip expired or malformed rows.
- An expired current story no longer produces a next/previous destination, avoiding stale viewer transitions between periodic feed cleanup runs.
- Added deterministic tests for expired items, malformed expiry timestamps, owner sequence filtering, global fallback, and time-boundary behavior.

This source change does not replace server-side expiry enforcement or production integration testing.
