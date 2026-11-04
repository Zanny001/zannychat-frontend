# ZannyChat Frontend 1.2.212 — Status reaction reliability

- Prevents rapid repeated taps from issuing overlapping reaction mutations for the same status.
- Shows a clear busy/disabled state while a reaction is being saved and refreshed.
- Improves screen-reader feedback for selected reactions and keeps reaction touch targets at least 44×44 points.
- Refreshes reaction summaries for currently active statuses only, avoiding unnecessary requests for expired items.
- Adds regression checks for per-status request locking, cleanup on failure, accessibility state, and active-status filtering.

This is a source release only. No live deployment or database migration was performed. Supabase authorization remains the security boundary.
