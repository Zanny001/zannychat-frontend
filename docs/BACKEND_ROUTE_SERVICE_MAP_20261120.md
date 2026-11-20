# ZannyChat Backend Route-to-Service Map

**Snapshot:** 2026-11-20  
**Repository:** `Zanny001/zannychat-backend`  
**Source reviewed:** `src/index.js` and all 16 mounted route modules.  
**Scope:** Static route/service inventory. This is not a complete per-handler authorization or production runtime audit.

## 1. Request boundary and server-wide controls

The Express application applies the following controls before mounting business routes:

- Disables the `X-Powered-By` fingerprint.
- Sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store` and a restrictive `Permissions-Policy`; HSTS is emitted in production.
- Uses `requestObservability`, documented to avoid raw URLs, request bodies, identities and secrets.
- Trusts exactly one proxy hop for client-IP/rate-limit behavior.
- Uses an explicit CORS allowlist from `config/corsOptions`; no wildcard origin.
- Mounts the LiveKit webhook before JSON parsing so signature verification sees raw bytes.
- Limits ordinary JSON bodies to 100 KB with strict JSON parsing.
- Exposes root service discovery and health/liveness/readiness routes without returning secrets.
- Returns a generic error message for server failures and logs CORS rejections separately.

## 2. Mounted route modules

| Mount | Route module | Main responsibility | Key dependencies / trust boundary |
|---|---|---|---|
| `/health` | `routes/health.js` | Liveness, readiness and health diagnostics | Supabase admin reachability and `safeHealthDiagnostic`; keep diagnostics sanitized |
| `/conversations` | `routes/conversations.js` | Direct/group conversation creation, group invites, metadata, membership/admin changes and scheduled messages | `requireAuth`, conversation rate limiter, Supabase admin, participant/group validation, group-invite privacy evaluation and scheduled-date validation |
| `/ai` | `routes/ai.js` | Smart replies, conversation summaries and translation | `requireAuth`, AI rate limiter, provider configuration, bounded transcript construction and input validation |
| `/link-preview` | `routes/linkPreview.js` | Authenticated URL metadata preview | `requireAuth`, rate limiter, DNS/IP/host blocking and bounded HTTP(S) retrieval; SSRF boundary |
| `/safety` | `routes/safety.js` | Block/unblock, blocked-user list and user reports | `requireAuth`, safety rate limiter, UUID validation and Supabase-backed block/report records |
| `/account` | `routes/account.js` | Account deletion request and personal-media cleanup scheduling | `requireAuth`, dedicated deletion limiter, Supabase admin and account-storage cleanup worker |
| `/channels` | `routes/channels.js` | Channel discovery/creation, subscriptions, moderators, posts, comments, reactions, pins, reports and channel invitations | `requireAuth`, conversation limiter, Supabase admin, role/membership checks and cursor normalization |
| `/discovery` | `routes/discovery.js` | Phone-discovery enrollment and privacy-preserving contact matching | `requireAuth`, match limiter, E.164 normalization, keyed phone hashes, bounded batch hashing and match filtering |
| `/calls/history` | `routes/callHistory.js` | Hidden call-history listing and history removal | `requireAuth`, rate limiter and caller-scoped Supabase records |
| `/calls` | `routes/calls.js` | Native call events, VoIP tokens, call notifications, LiveKit tokens and ICE configuration | `requireAuth`, per-action rate limits, TURN credential builder, LiveKit token service, invitation/end-notification workers and Supabase admin |
| `/group-calls` | `routes/groupCalls.js` | Group-call create/upgrade/join/heartbeat/participants/invite/leave/end | `requireAuth`, rate limits, LiveKit token service, push delivery and group-call media cleanup |
| `/live` | `routes/liveEvents.js` | LIVE event creation/update/cancel, invitations, RSVP and stream attachment | `requireAuth`, event creation limiter, Supabase admin and push delivery |
| `/live` | `routes/liveStreams.js` | LIVE creation/join/heartbeat/leave/end, comments, reactions, guest requests/invites, participant/moderator controls, reports, creator profile/preferences/follows, replay lifecycle and leaderboard | `requireAuth`, action-specific rate limits, LiveKit token/room-admin services, push delivery and replay worker coordination |
| `/live` | `routes/liveHistory.js` | LIVE history removal | `requireAuth`, limiter, Supabase admin and LiveKit room teardown |
| `/webhooks/livekit` | `routes/livekitEgressWebhook.js` | Signed LiveKit Egress lifecycle events and replay finalization | Raw request body, LiveKit webhook signature verification and `finalizeReplay`; do not route through ordinary JSON parsing |
| `/webhooks` | `routes/internal.js` | Internal push delivery, receipt processing, message notifications, attachment cleanup and call-notification retries | Shared internal-secret middleware, Supabase admin, push/receipt clients and bounded cleanup/notification jobs |

The three `/live` routers are intentionally mounted separately at the same prefix. Their route families should be checked for ordering collisions whenever new parameterized routes are introduced. The current mount order is events, streams, then history.

## 3. Cross-module service flows

### Messaging and group lifecycle
- Conversation handlers validate direct participants and group input before writes.
- Group invite policy is evaluated in a dedicated utility.
- Scheduled messages validate allowed send times and are exposed through conversation routes.
- Internal notification hooks are authenticated with a shared secret and are not public client endpoints.
- Attachment cleanup is invoked through the internal boundary and worker/job code, not through arbitrary client-selected storage paths.

### Calling
- Call routes issue LiveKit tokens and ICE/TURN configuration only after authentication and action-specific checks.
- Call invitation and call-ended push delivery use bounded queue workers with database claim RPCs and retry state.
- Group-call routes own the participant lifecycle and LiveKit room operations; the group-call cleanup worker handles ended media rooms.
- Call-history hiding/removal is a separate caller-scoped route family.

### LIVE and replay
- `liveStreams` owns creator/viewer/guest/moderator actions and uses the LiveKit room-admin service for server-side participant control.
- Replay start/stop is coordinated with the replay lifecycle worker; signed Egress callbacks finalize replay state.
- LIVE event invitations and reminders are separate from stream participant invitations.
- LIVE history deletion is separate from the stream's active end operation.

### Privacy and discovery
- Safety block/report routes are separate from profile/contact discovery.
- Phone discovery uses normalized numbers and keyed hashes rather than sending raw address books to the matching query.
- Link previews are a network-fetch feature and therefore retain DNS/IP/host filtering and bounded retrieval safeguards.

## 4. Audit gaps and required next checks

This inventory does not certify every route handler. The following are still required before Phase 1 can be closed:

1. For every route handler, verify authentication middleware is applied either at router scope or at the handler, and verify no route is accidentally reachable before middleware.
2. Trace each handler's authorization predicate: caller identity, conversation/stream/channel membership, role, ownership, block state, audience, and resource-state transition.
3. Verify request schemas, string/array limits, pagination bounds, rate-limit keys and error mapping for every mutation.
4. Trace all Supabase writes to database constraints/RLS/triggers and all Storage operations to owner/path/bucket restrictions.
5. Add caller-context tests for owner, member, moderator, non-member, blocked user, expired invite, ended room and stale call states where applicable.
6. Verify every external provider call has bounded timeouts, safe retry semantics, redacted logs and observable terminal failure.
7. Verify production worker liveness, last-success freshness, queue depth, lease expiry and alert delivery; source code and a successful CI run are not runtime proof.

No production database, Auth, Storage, provider, deployment or infrastructure change was made while producing this map.

## 5. Route-level authentication boundary verification

A static pass across all 16 mounted route modules confirmed the following route-level boundary:

- Thirteen business routers use `router.use(requireAuth, ...)` or `router.use(requireAuth)` before route registration: conversations, AI, link preview, safety, account, channels, discovery, calls, call history, group calls, LIVE history, LIVE streams and LIVE events.
- The internal router does not use user auth; all four internal POST routes attach `requireInternalSecret` directly.
- The LiveKit Egress webhook does not use user auth; its single route verifies the signed webhook against the raw body before processing.
- The health router intentionally exposes three sanitized liveness/readiness/health endpoints without user auth.

The inspected route modules declare 139 route handlers in total: 131 inherited through the 13 authenticated business routers, four internal-secret routes, one signed LiveKit webhook and three public health routes. This closes the router-level authentication placement check, but **does not** close the per-handler authorization audit: every service-role query/mutation still needs its own caller ownership, membership, role, block, audience and resource-state review.
