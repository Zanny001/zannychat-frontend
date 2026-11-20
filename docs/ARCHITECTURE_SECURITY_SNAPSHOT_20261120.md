# ZannyChat Architecture and Security Snapshot — 2026-11-20

**Scope:** Read-only source and production catalog review  
**Repositories:** `Zanny001/zannychat-frontend`, `Zanny001/zannychat-backend`  
**Supabase project:** `vithpppgyjmazxvogvno`  
**Status:** Initial verified inventory; not a complete threat-model or runtime acceptance sign-off

> This snapshot records what was observed on 2026-11-20. Production database queries were read-only. No migration, data mutation, Auth setting change, Storage object change, deployment or infrastructure change was performed.

## 1. Frontend navigation and service boundary

### Current navigation counts

A source parse of `src/navigation/AppNavigator.js` on frontend main found:

- 56 unique screen modules imported from `src/screens`.
- 57 `RootStack.Screen` declarations.
- 53 unique stack route names (some route names are conditionally declared more than once).
- Six primary tabs: Chats, Calls, LIVE, Updates, Channels and Profile.

The six tabs remain the product's top-level navigation contract. The current 56-module/53-route source inventory is newer than the canonical register's earlier 48-experience matrix. Do not silently treat 48 as the current route count: reconcile route declarations, modules and user journeys into a fresh experience matrix, preserving nested experiences and avoiding double-counting shared screens.

### Frontend domain boundaries (sampled)

- Inbox and chat: API/Supabase, presence, folders, status, message outbox, attachment outbox, media preferences, saved/pinned messages, drafts, read receipts and chat appearance.
- Status: status API, media recovery, audience/privacy selection, expiry and grouping utilities.
- Channels: backend API, directory/pagination, drafts, validation and publish guards.
- Calls: call API, backend API, Supabase, native call system, call policy and network status.
- LIVE: backend API, Supabase, LiveKit-facing services and discovery utilities.
- Profile/privacy: API, backend API, Supabase, Google auth, validation and privacy checkup.

This is a sampled dependency map, not a complete import graph. Next step: produce a module-to-service dependency graph and identify screens that own duplicate network/state logic or bypass domain services. Avoid introducing a competing API client or state layer.

### Current stack

Frontend package metadata reports Expo SDK `~57.0.32`, React Native `0.86.3`, React `19.2.3`, Supabase JS `2.117.3`, LiveKit React Native `3.1.0`, LiveKit WebRTC `150.1.1`, and `livekit-client` `2.23.0`. Treat native build/device validation as separate from web export or static contracts.

## 2. Backend request and worker topology

### Express route modules

`src/index.js` mounts 16 route modules:

| Domain | Route module | Mount |
|---|---|---|
| Health | `routes/health` | `/health` |
| Conversations | `routes/conversations` | `/conversations` |
| AI | `routes/ai` | `/ai` |
| Internal notifications | `routes/internal` | `/webhooks` |
| LiveKit Egress webhook | `routes/livekitEgressWebhook` | `/webhooks/livekit` (raw body before JSON parser) |
| Link preview | `routes/linkPreview` | `/link-preview` |
| Safety | `routes/safety` | `/safety` |
| Account | `routes/account` | `/account` |
| Channels | `routes/channels` | `/channels` |
| Discovery | `routes/discovery` | `/discovery` |
| Direct calls | `routes/calls` | `/calls` |
| Call history | `routes/callHistory` | `/calls/history` |
| Group calls | `routes/groupCalls` | `/group-calls` |
| LIVE streams | `routes/liveStreams` | `/live` |
| LIVE history | `routes/liveHistory` | `/live` |
| LIVE events | `routes/liveEvents` | `/live` |

Shared request controls include `requireAuth` in protected routes, `createCorsOptions()`, request observability, one-hop trusted proxy configuration, a strict 100 KiB JSON body limit, no-store API responses, sanitized error responses and security headers. CORS uses an explicit origin set with the Vercel production domain; no wildcard origin was found in `src/config/corsOptions.js`.

### Recurring worker starters

The server starts nine recurring worker loops when run directly:

1. Call invitation notifications
2. Call-ended notification retries
3. Group-call media cleanup
4. LIVE/group media participant heartbeat and ended-room cleanup
5. Stale call-session cleanup
6. Account storage cleanup
7. LIVE replay lifecycle/recovery
8. LIVE event reminders
9. LIVE stream timeout warnings

Each loop has an in-process running guard and bounded work in its worker implementation. This source inventory does not prove production liveness, distributed single-instance safety, successful execution, or alert delivery. Next step: map each worker to its database claim/lease mechanism, retry policy, idempotency key, retention rule and observable failure signal. The free single-instance deployment constraint remains important.

## 3. Supabase production inventory

Read-only catalog snapshot for project `vithpppgyjmazxvogvno`:

- 118 tables returned across `auth`, `vault`, `storage`, `realtime`, `public` and `supabase_migrations`.
- 69 application tables in `public`; all 69 have RLS enabled.
- 110 migration-history rows; latest returned row is `20261119220130 / live_stream_hard_timeout`.
- 79 public functions/RPCs, of which 76 are marked `SECURITY DEFINER`.
- 61 public RLS policies.
- No public views or materialized views were returned by the catalog query.

### Public table domains

| Domain | Observed tables |
|---|---|
| Identity, profile, safety and presence | `profiles`, `profile_details`, `blocked_users`, `reports`, `phone_discovery`, `phone_discovery_match_limits`, `people_search_limits`, `user_presence_sessions` |
| Core messaging | `conversations`, `conversation_participants`, `messages`, `message_delivery_receipts`, `message_hidden_for`, `message_reactions`, `pinned_messages`, `scheduled_messages`, `message_attachment_cleanup` |
| Push and account cleanup | `push_tokens`, `push_receipt_tickets`, `account_storage_cleanup_jobs` |
| Status / Stories | `status_updates`, `status_views`, `status_reactions`, `status_replies`, `status_audience_recipients`, `status_excluded_users`, `muted_status_users` |
| Groups and calls | `group_invites`, `group_call_rooms`, `group_call_participants`, `call_sessions`, `call_signals`, `call_end_notifications`, `call_history_hidden`, `call_invitation_notifications`, `call_voip_tokens` |
| Channels | `channels`, `channel_posts`, `channel_subscriptions`, `channel_invites`, `channel_moderators`, `channel_post_comments`, `channel_comment_reactions`, `channel_post_reactions`, `channel_post_reports`, `channel_post_views` |
| Polls and conversation events | `polls`, `poll_options`, `poll_votes`, `conversation_events`, `conversation_event_rsvps` |
| LIVE streams, creators and events | `live_streams`, `live_stream_participants`, `live_stream_comments`, `live_stream_reactions`, `live_stream_invites`, `live_stream_moderators`, `live_stream_reports`, `live_stream_replays`, `live_replay_quota`, `live_creator_follows`, `live_creator_impact`, `live_creator_impact_daily`, `live_creator_impact_supporters`, `live_creator_preferences`, `live_events`, `live_event_attendees`, `live_event_invites`, `live_event_reminder_deliveries` |

### RLS and table grants

- 42 public tables have RLS enabled and no policies. A direct effective-privilege query found zero of those tables grant `SELECT`, `INSERT`, `UPDATE` or `DELETE` to `anon` or `authenticated`.
- These tables appear to follow a backend/service-role-only access model. Preserve the distinction between an advisor INFO notice and actual client exposure.
- Do not add blanket policies to suppress the advisor output. Instead, keep a table-to-route/role ownership map and recheck grants whenever a migration changes access.
- No public table with RLS disabled was found in this snapshot.

### SECURITY DEFINER function triage

- 76 of 79 public functions are `SECURITY DEFINER`.
- 28 are executable by `authenticated`; none of these 28 are executable by `anon`.
- All 28 have an explicit configured `search_path`.
- First-pass source inspection found 24 functions directly bind to `auth.uid()`. The remaining four are two compatibility overloads delegating to the identity-checking overloads and two profile-path helpers delegating to `can_view_profile_avatar`.
- This is a preliminary identity/grant triage, not a complete authorization proof. Review each function's full body, delegated helper chain, argument trust, row ownership, write scope and allowed/denied caller tests against prior security review evidence. Do not blanket-revoke functions required by RLS or application RPCs.
- The advisor warning is not itself proof of a vulnerability. Keep the function inventory and review rationale versioned.

### Storage buckets and access posture

| Bucket | Public flag | Configured size limit |
|---|---:|---:|
| `live-replays` | false | 48,000,000 bytes |
| `chat-media` | false | 26,214,400 bytes |
| `private-avatars` | false | 10,485,760 bytes |
| `status-media` | false | 52,428,800 bytes |
| `avatars` | true | 10,485,760 bytes |

Storage object policies were observed for authenticated conversation-member chat media, owner-controlled avatar uploads/deletes, private-avatar privacy checks, and status-media visibility through `can_view_status`. The `avatars` bucket is explicitly public: public object reads are not made private by an authenticated SELECT policy. Keep public and private avatar paths distinct, and verify that profile visibility never exposes private-avatar object paths or signed URLs.

## 4. Security and performance advisor snapshot

Observed 2026-11-20:

| Finding | Count / level | Handling |
|---|---:|---|
| RLS enabled, no policies | 42 / INFO | No direct anon/authenticated table privileges found; preserve service-role-only model |
| Authenticated can execute SECURITY DEFINER | 28 / WARN | First-pass review found configured search_path and identity binding/delegation; complete function-by-function review remains |
| Leaked-password protection disabled | 1 / WARN | Supabase plan-gated setting; no paid upgrade or setting change authorized |
| Unindexed foreign keys | 2 / INFO | `live_event_invites.invited_by`, `live_event_reminder_deliveries.user_id`; assess query plans before proposing indexes |
| Unused indexes | 66 / INFO | Do not drop based on advisor alone; gather representative workload/query-plan evidence |
| Health advisor | 0 findings | Snapshot only, not a general service availability guarantee |

The latest migration history row for LIVE creator preferences is reported as version `20261119184056` with name `live_creator_preferences_20261119180000`; the source migration file is `20261119180000_live_creator_preferences.sql`. The table exists and the read-only privilege check confirmed RLS enabled, no direct anon/authenticated SELECT and service-role SELECT. Reconcile the filename/version provenance against the guarded GitHub workflow log before future migration work; do not repair or replay migration history based only on this difference.

## 5. Browser and API security headers

Frontend `vercel.json` and `netlify.toml` currently set:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Permissions-Policy: camera=(self), microphone=(self), geolocation=(self)`
- `Strict-Transport-Security`
- `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'`

The current CSP is a restrictive fragment but not a complete script/resource policy: it does not specify `default-src` or `script-src`. Do not append guessed allowlists. Inventory the real Expo web, Supabase, backend, LiveKit, OAuth, font and media origins; deploy a report-only policy first, test sign-in, deep links, media, calls and LIVE, then enforce a least-privilege policy with a rollback path.

Backend `src/config/corsOptions.js` uses explicit production origins including `https://zannychat.vercel.app`, the current Netlify domain and a legacy Netlify origin; local development origins are added only outside production. No wildcard CORS origin was observed.

## 6. Phase 1 next actions

1. Reconcile the canonical 48-experience matrix against the current 56 imported screen modules, 57 stack declarations, 53 unique stack route names and six tabs.
2. Build the complete frontend screen-to-service dependency graph and identify duplicate ownership.
3. Build a backend route-to-middleware/service/provider/data map and a worker lifecycle/lease/alert matrix.
4. Complete a full table/RPC/trigger/storage/publication ownership map, including all effective role grants and delegated SECURITY DEFINER call chains.
5. Reconcile migration source filenames, local repository versions and production history without changing production history.
6. Review the two unindexed foreign keys with actual query plans and assess CSP in report-only mode only after origin inventory.
7. Convert confirmed issues into small, scoped implementation PRs; keep uncertain findings as open review tasks.

**No production schema change, privilege change, Storage policy change, Auth setting change, CORS/CSP change or index change is authorized by this snapshot.**

## 7. Background-worker lifecycle review — source inspection, 2026-11-20

This is a source-level control-flow review of the nine worker loops started by `src/index.js`. It does not establish that a worker is running or succeeding in production.

| Worker | Claim / coordination observed | Retry, cleanup and observable outcome | Review status |
|---|---|---|---|
| Call invitation notifications | `claim_call_invitation_notifications` RPC claims bounded batches; queue rows carry a lease timestamp | 15-second exponential retry capped at 15 minutes; maximum 10 attempts; expired/no-token outcomes are recorded; errors are logged | DB claim path and bounded retry observed; inspect RPC body/lease expiry and alerting |
| Call-ended notifications | `claim_call_end_notifications` RPC claims bounded batches; lease field is cleared on completion/retry | 15-second exponential retry capped at 15 minutes; maximum 12 attempts; terminal state and last error recorded | DB claim path and bounded retry observed; inspect RPC body/lease expiry and alerting |
| Group-call media teardown | Bounded scan of ended rooms with `media_terminated_at IS NULL`; no DB claim lease in worker | Deletes room then conditionally stamps termination; LiveKit 404 is treated as already absent; failed deletes remain retryable and are logged | Safe to retry by source semantics; multi-instance duplicate attempts remain possible |
| Media participant heartbeat / ended LIVE-room cleanup | Stale participant state is handled by `cleanup_stale_media_participants` RPC; ended LIVE rooms are scanned after a 60-second grace period | Three-minute default stale threshold; active/recording replays protect rooms from deletion; LiveKit 404 is idempotent | RPC ownership/lease body still needs review; LIVE-room deletion has no persistent claim marker in this worker |
| Stale call-session cleanup | `cleanup_stale_call_signals` RPC | Runs every 60 seconds; deleted-signal count is logged when nonzero | RPC body and retention semantics still need review |
| Account storage cleanup | Bounded scan of due `held`/`pending` jobs; only a process-local `workerRunning` guard is visible; no DB claim/lease is performed in this worker | Removes objects only from the enumerated personal buckets and owner/path-filtered rows, in batches of 100; successful job is deleted; failures use exponential retry capped at 24 hours | **Concurrency risk to assess:** multiple backend processes could select the same job; current source-level protection is process-local. Do not add a migration until deployment topology and job semantics are confirmed |
| LIVE replay lifecycle/recovery | Module-level singleton guard; periodic scans of replay rows; no durable distributed worker lease is visible in the inspected worker | Recovery/reconciliation every 60 seconds; replay stop/recovery grace 15 minutes; maximum replay duration is imported from the Egress service; retention cleanup every six hours; private objects and expired rows are removed | Single-process lifecycle is explicit; multi-instance coordination and failure alerting need review |
| LIVE event reminders | `claim_live_event_reminders` RPC claims a bounded batch and marks rows as sending | Provider acceptance marks sent; failure is recorded and logged; worker runs every 60 seconds | Inspect claim/reclaim semantics and retry window in the RPC body |
| LIVE stream timeout warnings | `claim_live_stream_timeout_warnings` RPC; failed delivery is released through `release_live_stream_timeout_warning` | Runs every 30 seconds; creator warning is for the final 10 minutes of the four-hour stream cap; failed claims are released for retry | Claim/release path observed; inspect RPC body and alerting |

### Cross-cutting findings and constraints

- All nine starter loops use in-process overlap guards (or a module-level singleton for replay). These guards do not coordinate separate Node processes.
- The source has bounded batch sizes and worker-specific logs, but no centralized heartbeat/last-success metric or alert delivery contract was established in this pass.
- The current single-instance deployment constraint reduces—but does not eliminate—cross-process races during restarts, overlapping deploys or future scale-out. Confirm the actual production instance topology before changing worker coordination.
- Prioritize a read-only review of the SQL bodies for the claim/cleanup RPCs and the account-storage job state machine. Any DDL or job-state migration is a separate proposal requiring impact/rollback review and the user's explicit approval.
- Never run cleanup workers manually against production as a diagnostic: account-storage and replay cleanup perform irreversible object/row deletion after their expiry/eligibility checks.

## 8. LIVE creator-preferences migration provenance

Read-only production history lists `20261119184056 / live_creator_preferences_20261119180000`; the repository source file is `20261119180000_live_creator_preferences.sql`. The table exists with RLS enabled, direct `anon`/`authenticated` table access revoked, and service-role access granted.

The inspected historical workflow run `44501209658` is **not** the creator-preferences migration run: its successful log shows only `20261118221000_live_experience_modes.sql` and `20261118223000_block_removed_live_participants.sql` were applied. The current guarded workflow `.github/workflows/live-creator-preferences-migration.yml` expects exactly `20261119180000` to be pending and would refuse to apply if the observed production history remains unchanged. The actual mechanism that recorded version `20261119184056` was not established from the available workflow evidence.

**Do not dispatch the guarded workflow, replay the SQL, edit migration history, or create a compensating migration to normalize the timestamp.** Reconcile the original apply event and source checksum through the appropriate Supabase/GitHub audit trail first. The table's observed existence and privileges are not proof of the exact source checksum that was applied.

### Database claim RPC and service-role authorization checks

A read-only production query retrieved the full definitions and effective execute grants for the worker RPCs listed above:

- `claim_call_invitation_notifications` and `claim_call_end_notifications` use row-level `FOR UPDATE SKIP LOCKED` claiming and recover stale processing leases after five and two minutes respectively. The inspected overloads are executable by `service_role`, not by `anon` or `authenticated`.
- `claim_live_event_reminders` inserts missing recipient rows idempotently, rechecks event audience and bidirectional block visibility, then claims due rows with `FOR UPDATE OF d SKIP LOCKED`. Stale `sending` rows are reclaimable after ten minutes. It is executable only by `service_role`.
- `claim_live_stream_timeout_warnings` atomically marks eligible live streams at the 3h50m threshold; `release_live_stream_timeout_warning` clears the marker only while the stream remains live. Both are executable only by `service_role`.
- `cleanup_stale_media_participants` validates its cutoff and atomically ends over-age/stale LIVE streams, marks stale participants left and ends empty group-call rooms. `cleanup_stale_call_signals` expires ringing calls, closes accepted sessions after three minutes without activity and deletes terminal/old signaling rows. Both are executable only by `service_role`.
- All inspected worker RPCs are SECURITY DEFINER with an explicit configured search path. The effective grant check found no `anon` or `authenticated` EXECUTE privilege and confirmed `service_role` EXECUTE.

The production `account_storage_cleanup_jobs` table has only `held` and `pending` allowed states; it has no processing/lease column in the observed schema. Effective table privileges are service-role-only. This confirms the worker's process-local guard is not backed by a database claim lease. It is a concurrency-hardening candidate if the backend ever runs multiple workers/processes, but no change is justified until deployment topology, job creation semantics and duplicate-cleanup behaviour are verified. Do not add a state or lease column without an explicitly approved migration.
