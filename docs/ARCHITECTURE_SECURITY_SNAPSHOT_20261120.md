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

## 9. Authenticated SECURITY DEFINER function review — delegated paths and privacy semantics

A read-only production query inspected all 28 public SECURITY DEFINER functions executable by `authenticated`. All 28 have configured search paths; none of the 28 is executable by `anon`. Twenty-four directly bind the acting identity to `auth.uid()`; the four without a direct check were reviewed with their delegated helper chains:

- `cast_poll_vote(uuid, uuid)` delegates to `cast_poll_vote(uuid, uuid[])`, which checks `auth.uid()`, conversation membership, poll open state, unique option IDs, option ownership, and the single-/multi-select rule before replacing the caller's votes.
- `create_conversation_poll(uuid, text, text[], timestamptz)` delegates to the five-argument overload, which checks `auth.uid()`, conversation membership, question/option lengths, unique options and future closing time.
- `get_visible_profile_avatar_path(uuid)` delegates visibility to `can_view_profile_avatar(uuid)`; `get_visible_profile_cover_path(uuid)` uses the same helper and additionally requires non-empty public profile details.
- `can_view_profile_avatar(uuid)` rejects null/anonymous viewers, allows the owner, denies either-direction blocks, enforces profile/photo `nobody` and `contacts` visibility, and requires shared conversation membership for contacts-only visibility.

No identity bypass was found in those four delegated paths. Additional direct-body checks confirmed: `can_view_status` binds its viewer argument to `auth.uid()` and checks expiry, audience, exclusions and blocks; people-search RPCs share a per-user 30-request/minute quota and cap result sizes; contact/presence helpers enforce shared conversation and block/privacy rules; status view counts are owner-scoped and cap requests at 200 IDs; call heartbeats require an authenticated caller/callee on an accepted, recently active session; and profile-visibility updates validate enum values and require public avatar removal/private-copy prerequisites before restriction.

### Privacy semantics requiring product confirmation (no mutation)

`get_conversation_profile_directory(uuid[])` requires an authenticated viewer, caps the requested list at 500, and returns only users sharing a conversation with the viewer. It gates avatar URLs through `can_view_profile_avatar` and suppresses online state for blocked pairs or hidden presence. However, unlike `get_contact_directory` and public-profile lookup, it does not filter rows when `profile_visibility = 'nobody'`; it still returns basic conversation identity fields (name, username, avatar color, status). This may be intentional so existing conversation members can identify message participants, but the product meaning of the Edit Profile choice “Who can view your profile: Nobody” must be confirmed against this behavior before calling profile privacy fully certified. No policy, function or data change was made.

The full SECURITY DEFINER audit is not closed: the remaining 24 direct-identity functions still need a complete per-function argument/ownership/membership review and caller-context tests, not merely the direct `auth.uid()` presence check.

## 10. Cross-mode single-active-call invariant — verified gap, 2026-11-20

Read-only source and production schema review found that the single-active-call invariant is enforced for direct-call creation only against other direct `call_sessions`, not against active group-call memberships:

- The `validate_call_session_write` INSERT trigger acquires deterministic per-participant advisory transaction locks and rejects overlapping active/ringing `call_sessions`, but it does not inspect `group_call_participants` joined to active `group_call_rooms`.
- `join_group_call_room` and `join_direct_call_room` validate room state, invitation/membership, blocks, capacity and rejoin state, but do not reject a user with another active direct call or a joined participant row in another active group-call room.
- `create_group_call_room` checks group membership, host/invitee blocks, capacity and stale rooms, but does not check whether the host already belongs to another active call. The invite RPC checks invitees for other active calls, but that does not cover the host or join-time races.
- The schema has a unique active-room-per-conversation index and a unique (room_id,user_id) participant index, but no cross-room active-participant constraint. Direct-call indexes likewise do not enforce a group-call overlap constraint.
- A read-only production query at audit time found **no current duplicate active group-room memberships, no duplicate active direct call sessions, and no direct-call/group-call overlaps**. This is a latent invariant gap, not evidence of an active production incident.

### Required atomic fix (proposal only; no migration executed)

Use one shared per-user `pg_advisory_xact_lock(hashtextextended(user_id::text, 0))` convention, acquired in sorted UUID order when locking multiple participants. Apply it consistently in:

1. `validate_call_session_write` for direct-call creation, adding an active-group-membership check after locking caller/callee.
2. `create_group_call_room` for the host's initial joined membership.
3. `join_group_call_room` and `join_direct_call_room` before transitioning a participant to joined; reject any other non-ended direct call or joined participant row in a different active group room.
4. `promote_direct_call_to_group_room` for both existing call participants, rejecting any other active group-room membership before the conversion.

Keep current-call exceptions explicit: direct-call promotion may end its own source session, and a direct-call room's own `source_call_id` must not be mistaken for a conflicting active call after promotion. Reuse existing error codes so the backend maps conflicts to a stable HTTP 409 response. Add concurrent integration tests proving two competing joins/starts cannot both succeed for the same user, plus tests for legitimate promotion, leave-then-rejoin, stale-call cleanup and different users joining separate rooms.

This requires a reviewed database migration because the invariant spans multiple SECURITY DEFINER functions and a trigger. Do not apply it to production without the user's explicit migration approval. The local Supabase CLI was not available in the current execution environment, so no migration filename was fabricated; the migration must be generated with the repository's pinned CLI workflow before a PR is opened.

## 11. LIVE production row checkpoint — Gas

Read-only query on 2026-11-20 returned the most recent `Gas` LIVE row as `status='ended'`, started at `2026-11-20 08:46:34.564304+00` and ended at `2026-11-20 11:09:07.279059+00`. The table has no `ended_reason`/actor column, so the cause cannot be inferred from this row. The audit did not create, stop, update or otherwise mutate the stream. The user has not confirmed creator/viewer acceptance after the PR #212 deployment, so Phase 0 remains open.

## 12. Interface merge checkpoint — 2026-11-20

Frontend PRs #218, #219, #220, #221, #224, #225 and #226 are merged. They establish centered 760px collection/content columns, 480px auth/form columns, a 1280px group-call media-stage cap and responsive mobile fluid widths across the screen groups listed in Delivery Register section 32. PR #215 and #217 improve honest persistence feedback. These are code/CI milestones only: Vercel's free-team build-rate limit remains, and no production deployment or physical-device visual acceptance is inferred from a GitHub merge.

## 13. Privacy preference enforcement and profile-media ownership gaps — 2026-11-20

### Verified enforcement already present
- `get_conversation_read_state` suppresses read-receipt state when the target user's `show_read_receipts` preference is false.
- `get_visible_presence` checks shared-conversation membership, blocks and `show_online_status` / `show_last_seen` preferences.
- `can_view_status` binds viewer identity to `auth.uid()` and checks status expiry, audience, selected recipients and bidirectional blocks.
- The direct-call `enforce_call_recipient_privacy` trigger checks the callee's `call_permission` before a direct call is created.
- `private.guard_profile_visibility_changes` prevents direct client changes to profile/photo visibility except through the validated visibility RPC; `private.guard_public_avatar_pointer` prevents a non-public profile from retaining a public avatar pointer.
- The `status_updates` trigger stamps creation time and makes it immutable on update; expiry is constrained to the supported 6/12/24/48-hour windows and no more than 48 hours after creation.
- Column-level grants on `conversation_participants` limit client updates to read/favorite/mute/archive fields; clients cannot update conversation_id, user_id or admin role. Message updates are limited to message text/edited_at; sender/conversation identity and delete state are not client-updatable.

### Verified privacy gaps requiring migration

**A. Group invite acceptance does not enforce the recipient's group-invite preference.**

The route `POST /conversations/invites/accept` passes the authenticated user ID to service-role RPC `public.accept_group_invite`. The RPC validates token, expiry, revocation, use limit, group existence and duplicate membership, then inserts the participant and increments use count. It does not check `profile_details.group_invite_permission` or block state. The application utility `evaluateGroupInvitePrivacy` is used when creating a group with initial members, but it is not called by the invite-link acceptance path. Therefore a user who has selected `Nobody` (or `Contacts` with a non-contact inviter) can still accept a forwarded group invite.

**B. Group-call invitations do not enforce the recipient's call preference.**

The direct-call trigger checks `call_permission`, but the service-role group-call RPCs `create_group_call_room`, `invite_group_call_participants`, `promote_direct_call_to_group_room`, `join_group_call_room` and `join_direct_call_room` do not reference `call_permission`. The direct-call-to-group promotion RPC checks `profile_visibility` for invitees instead, which is not the same preference. This means group-call invites can bypass `Nobody` and `Contacts` call settings, while direct calls respect them.

**C. Profile media pointers lack owner-path integrity enforcement.**

Authenticated users can update their own `profile_details.avatar_path` and `cover_path`; the table has visibility/activity triggers but no trigger or check constraint requiring the first storage path segment to equal `user_id` or requiring the referenced object to be owned by that user in `private-avatars`. Likewise, the `profiles.avatar_url` trigger enforces visibility state but does not verify that a non-null URL points to an object in the caller's own `avatars/<user_id>/...` path. The app upload helpers use owner-scoped paths, but direct authenticated table writes can bypass those client helpers. A user could point their profile at another user's avatar object they are already allowed to view, causing identity spoofing; arbitrary public URLs can also cause other clients to fetch an external host.

A read-only data-shape check found no current bad pointers: three non-null public avatar URLs all match their owner's public `avatars/<user_id>/...` path; one non-null private avatar path has the correct owner prefix and an existing private object; zero cover paths are currently populated. This is a latent write-integrity gap, not evidence of current bad production data.

### Required migration/test plan (proposal only; no SQL applied)

1. Harden `accept_group_invite`: lock the invite row; load the recipient's `group_invite_permission`; reject `nobody`; for `contacts`, require a shared conversation with `created_by`; reject a bidirectional block between recipient and inviter; preserve existing token/expiry/revocation/use-limit/duplicate checks and stable error codes.
2. Enforce `call_permission` in group-call invite creation and direct-call promotion; replace the erroneous `profile_visibility` check with the correct call preference. For `contacts`, require a shared conversation with the inviting caller. Ensure initial group-call invitations skip or reject users with `nobody` according to a documented product rule, and do not send push notifications to them.
3. Add a per-user advisory transaction lock shared with the single-active-call fix in section 10; check direct and group call memberships atomically before create/join/promotion.
4. Add a `BEFORE INSERT OR UPDATE OF avatar_path, cover_path` trigger on `profile_details` that requires owner-prefixed paths and verifies the referenced `private-avatars` object is owned by `NEW.user_id`.
5. Add an ownership/host/path check for non-null `profiles.avatar_url` values. Preserve current owner-scoped public avatar URLs during the staged cutover; reject external or other-user URLs. Confirm custom-domain behavior before enforcing the exact host allowlist.
6. Add SQL integration tests for each preference (everyone/contacts/nobody), forwarded invites, blocked inviter, group-call invite, direct-call promotion, cross-mode concurrent join, owner path, other-user path, missing object and valid legacy public avatar URL.

These are migration-gated. No migration file was fabricated, no production SQL was applied, and no user data or storage object was changed.

## 14. Background worker reliability and idempotency review — 2026-11-20

All nine recurring loops started by `src/index.js` were inspected with their job modules and the key production claim/cleanup RPCs.

| Worker | Claim / lease / retry model | Review result |
|---|---|---|
| Call invitation notifications | `claim_call_invitation_notifications` uses `FOR UPDATE SKIP LOCKED`; 5-minute stale processing lease; 10 attempts with exponential backoff capped at 15 minutes | Good DB claim/retry boundary; no-token cases expire rather than retry indefinitely |
| Call-ended notifications | `claim_call_end_notifications` uses `FOR UPDATE SKIP LOCKED`; 2-minute stale lease; 12 attempts with exponential backoff capped at 15 minutes | Good DB claim/retry boundary; provider failures return to pending; no-token failures are bounded |
| Group-call media cleanup | Selects ended rooms with `media_terminated_at IS NULL`, deletes LiveKit room, then stamps termination time | External delete is idempotent (LiveKit 404 is treated as already absent); no DB lease, so multiple instances may duplicate a harmless delete |
| Media participant heartbeat cleanup | `cleanup_stale_media_participants` performs set-based status transitions for stale LIVE/group participants and ends empty group rooms | Atomic/idempotent state transition; 3-minute stale threshold; production liveness still unverified |
| Call-session/signaling cleanup | `cleanup_stale_call_signals` marks expired ringing calls missed, stale accepted calls ended after 3 minutes, and deletes terminal/old signals | Set-based idempotent cleanup; no separate lease required for these row-state transitions |
| Account storage cleanup | Selects due held/pending jobs; process-local `workerRunning` guard; retries with exponential delay capped at 24 hours; storage removal in 100-object batches | Storage deletion is repeatable, but there is no cross-instance DB claim/lease. Multiple backend instances can process the same job concurrently; add DB claim if service is scaled beyond one instance |
| LIVE replay lifecycle | Periodic scans reconcile Egress, stop expired/ended recordings, and clean expired storage; quota reservation/finalization is serialized by a singleton row and keyed by replay ID | Quota reservation/finalization is idempotent. Stop timers and `started` guard are process-local. `notifyReplayReady` sends push before setting `notification_sent_at`, so concurrent webhook/worker finalization can send duplicate “replay ready” pushes; add a DB notification claim/lease before scaling horizontally |
| LIVE event reminders | `claim_live_event_reminders` uses `FOR UPDATE SKIP LOCKED`, increments attempts and leases `sending` rows for 10 minutes; failed delivery is retryable before event start | Good database claim boundary; recipient eligibility, audience and creator block checks are included in claim query |
| LIVE stream timeout warnings | Single conditional UPDATE claims streams in the 3:50–4:00 hour window by setting `timeout_warning_sent_at`; failed delivery calls a release RPC so next 30-second tick retries | Atomic one-time claim with explicit retry release; no attempt counter, but retry window is bounded by the four-hour stream cap |

### Cross-cutting operational gaps

- The in-process `running` / `started` guards prevent duplicate loops within one Node process only; they are not distributed locks.
- Group-call room deletion and ended-LIVE room deletion rely on LiveKit's idempotent 404 behavior rather than a cross-instance claim. Ended LIVE room cleanup has no persisted “room deleted” marker and therefore rechecks already-deleted rooms on later ticks; harmless but noisy/inefficient.
- Account-storage cleanup has no DB lease/claim, and replay-ready notification has no atomic notification lease. These should be hardened before horizontal scaling.
- No worker currently exports a complete production heartbeat/last-success metric, queue depth, oldest due item, stale lease count or terminal-failure alert. Log output is not a durable operational SLO.
- Workers start only in the `require.main === module` path. Deployment must execute `node src/index.js` (or explicitly start workers from its entrypoint); source inspection alone does not prove the production process is running all nine loops. Render was not inspected per the user's instruction.

No worker was manually invoked and no queue, stream, call, replay, storage job or production state was modified during this review.


## 15. Reconciliation against backend privacy/replay fixes — 2026-11-20

The original privacy-gap list in section 13 was written before backend PRs #169–#172 merged. The following status supersedes the affected statements; it does not close the remaining database-boundary or production acceptance work.

### Group invite acceptance — application-layer enforcement added

Backend PR #169 (merged) now resolves the invite token to its creator, checks expiry/revocation/use count, verifies whether the recipient is already a member, and—before calling the service-role `accept_group_invite` RPC—loads the recipient's `group_invite_permission`, shared-conversation membership and bidirectional block rows. The existing `evaluateGroupInvitePrivacy` utility enforces `everyone` / `contacts` / `nobody` and rejects blocks. Backend PR #171 (merged) makes unknown preference values fail closed. Tests cover default, each preference, shared/non-shared contacts, both block directions and invalid preference values.

This is now verified in the trusted backend route, not atomically inside the SQL RPC. A narrow time-of-check/time-of-use interval remains between the route's privacy reads and the RPC's membership insert (for example, a block or preference could change between those operations). A future migration can move the check under the invite-row transaction lock, but is not required to describe the already-merged route fix. No migration was executed for PRs #169/#171.

### Group-call invitation privacy — application-layer enforcement added

Backend PR #170 (merged) adds a shared `evaluateCallInvitePrivacy` helper and checks `call_permission`, shared conversations and bidirectional blocks for direct-call-to-group upgrades, initial group-call invitations, and subsequent group-call invites. Unknown values fail closed. Tests cover `everyone` / `contacts` / `nobody`, shared/non-shared contacts, blocks and invalid values. This supersedes the section 13 statement that all group-call invitation routes omit preference checks.

The checks run in the trusted backend route before service-role RPC calls; they are not yet a single database transaction with the corresponding invite insertion. The cross-mode active-call concurrency gap in section 10 remains separate and unresolved.

### LIVE replay-ready notification deduplication — process-local improvement added

Backend PR #172 (merged) adds a process-local in-flight set and re-reads `notification_sent_at` before sending a replay-ready push, preventing concurrent webhook/recovery finalizers in one Node process from sending duplicate pushes. It also skips notifications when the replay row has disappeared. This improves the section 14 review, but the in-flight set is not a distributed claim: two backend processes can still race between the database read, push send and marker update. Add a durable claim/lease before horizontally scaling the replay worker; no migration was applied by PR #172.

### Still-open privacy and lifecycle items

- Profile avatar/cover storage-path ownership is still not enforced at the database boundary; section 13C remains open.
- Cross-mode single-active-call enforcement remains a migration-gated design in section 10.
- Group invite and group-call preference checks are route-enforced but not atomic with the membership/invitation write.
- Production worker liveness, multi-instance topology and operational alert delivery remain unverified; source logs and GitHub CI do not prove the production process is healthy.
- The Gas LIVE production incident still requires creator/viewer acceptance after the deployed frontend fix; the stream row checkpoint in section 11 is historical evidence only.

No production migration, SQL, data, storage, auth, infrastructure or cleanup job was changed while reconciling these merged backend fixes.
