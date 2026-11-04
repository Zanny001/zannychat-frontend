# Channel comment pagination UI — 1.2.190

- The frontend API now passes the timestamp + comment ID cursor through to the channel comments endpoint and preserves `nextCursor` / `hasMore` metadata.
- Channel discussions expose a Load older comments action when another page is available.
- Older comments are prepended in chronological order, duplicate comment IDs are ignored, and per-post loading state prevents repeat taps while a page is in flight.
- Automated tests cover cursor query parameters, metadata retention, deduplicating merges, and the UI affordance.

Verification is source/unit-test based; a live backend/database integration test and device-level UX test have not been performed.
