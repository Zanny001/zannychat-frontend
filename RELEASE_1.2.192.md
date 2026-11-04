# ZannyChat 1.2.192

## Status view count scalability and privacy
- Replaces downloading all status view receipts with a bounded SQL aggregate RPC.
- Requests owner-only view counts in chunks of at most 200 status IDs, avoiding PostgREST row-cap undercounts.
- The RPC returns counts only for statuses owned by the authenticated caller; individual viewer rows are never returned by this function.
- Count loading failures now surface a retryable feed error instead of silently showing zero views.

## Deployment
Apply `supabase/migrations/0050_own_status_view_counts.sql` before deploying this frontend. Automated source tests do not execute the migration against a live PostgreSQL database.
