# Channel post statistics aggregation — 1.2.187

## Change

The channel feed previously fetched raw reaction, comment, and view rows to calculate counts in the Node process. Popular posts could exceed PostgREST's response row cap, making comment/view counts silently too low while also transferring unnecessary data.

The feed now calls the `get_channel_post_stats` PostgreSQL function for at most 100 post IDs. The function aggregates reaction totals, the signed-in user's reaction, comment counts, and distinct-view counts in the database. Execute permission is limited to `service_role`; the API still performs channel visibility checks before invoking it.

## Deployment note

Apply `zannychat-backend-main/supabase/migrations/0049_channel_post_aggregated_stats.sql` to the intended Supabase project before deploying the matching backend. This source package does not apply database migrations or deploy services automatically.

## Verification

Focused source-level regression tests cover aggregate SQL, bounded input, restricted execution grants, and API use of the RPC. Run the full backend and frontend suites before production deployment.
