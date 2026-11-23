# ZannyChat Backend Route-to-Service Map — 2026-11-23

**Source:** `Zanny001/zannychat-backend/src/index.js` and current route-module source on 23 Nov 2026.  
**Status:** Mount and router-boundary inventory; not a complete per-handler authorization or runtime acceptance sign-off.

## Current topology

The backend entry point imports **26 route modules** and mounts **27 route registrations**. The additional mount is the unified Paystack dispatcher, which composes three signed provider handlers behind one Paystack integration URL while retaining legacy endpoint mounts for compatibility.

| Mount | Module | Boundary | Main responsibility / important dependencies |
|---|---|---|---|
| `/health` | `health` | Public, sanitized | Liveness and database readiness; bounded Supabase probe |
| `/diagnostics` | `clientDiagnostics` | Auth + rate limit | Client error diagnostics; bounded/redacted client reports |
| `/conversations` | `conversations` | Auth + conversation limiter | Direct/group conversations, metadata, membership/admin, invites and scheduled messages |
| `/ai` | `ai` | Auth + AI limiter | Smart replies, summaries and text translation; conversation membership checked before reading transcripts; Anthropic provider |
| `/webhooks` | `internal` | Per-handler internal secret | Push notifications, push receipts, call notifications and attachment cleanup |
| `/webhooks/livekit` | `livekitEgressWebhook` | Signed raw-body webhook | LiveKit Egress lifecycle and replay finalization |
| `/webhooks/paystack/live` | `paystackLiveWebhook` | Signed raw-body webhook | Sparks purchase fulfilment and purchase receipt creation |
| `/webhooks/paystack/live-risk` | `paystackLiveRiskWebhook` | Signed raw-body webhook | Refund/dispute verification and purchase/creator-earnings risk ledger |
| `/webhooks/paystack/live-payouts` | `paystackCreatorPayoutWebhook` | Signed raw-body webhook | Creator transfer success/failure/reversal reconciliation |
| `/webhooks/paystack` | dispatcher | Raw body; chained signed handlers | Single configured Paystack URL dispatches purchase, risk and payout events; unknown signed events are acknowledged safely |
| `/link-preview` | `linkPreview` | Auth + limiter | Bounded metadata fetch with DNS/IP/host SSRF defenses |
| `/safety` | `safety` | Auth + safety limiter | Block/unblock, blocked list and user reports |
| `/account` | `account` | Auth + deletion limiter | Account deletion and personal-media cleanup scheduling |
| `/channels` | `channels` | Auth + conversation limiter | Channel discovery, subscriptions, posts, comments, reactions, reports, moderators and invites |
| `/discovery` | `discovery` | Auth + discovery limiter | Phone enrollment and privacy-preserving contact matching using normalized E.164 values and keyed hashes |
| `/calls` | `calls` | Signed call-scoped exception, then auth + limiter | Direct calls, VoIP tokens, call notification, LiveKit tokens and TURN/ICE credentials |
| `/calls/history` | `callHistory` | Auth + limiter | Caller-scoped hidden call history and deletion |
| `/group-calls` | `groupCalls` | Auth + limiter | Group-call admission, upgrades, participants, invites, LiveKit tokens and cleanup |
| `/live` | `liveEvents` | Auth + limiter | LIVE events, invitations, RSVP and reminders |
| `/live` | `liveStreams` | Auth + limiter | Stream lifecycle, viewer/guest/moderator actions, reactions, replay lifecycle and creator functions |
| `/live` | `liveHistory` | Auth + limiter | LIVE history deletion and room teardown |
| `/live/gifts` | `liveGifts` | Auth + limiter | Gift catalogue, wallet/history and atomic gift sending; LiveKit room-data broadcast |
| `/live/battles` | `liveBattles` | Auth + limiter | PK battle create/accept/decline/start/finish; server-authoritative battle state |
| `/live/captions` | `liveCaptions` | Auth + AI limiter | Caption/translation status and text translation; this is not microphone speech transcription |
| `/live/purchases` | `livePurchases` | Auth + purchase limiter | Sparks package lookup, purchase initialization, history and private receipt access |
| `/live/creator-earnings` | `liveCreatorEarnings` | Auth + limiter | Creator earnings summary and ledger history |
| `/live/creator-payouts` | `liveCreatorPayouts` | Auth + payout limiter | Payout eligibility, banks, beneficiaries and payout requests |

## Important boundary exceptions and ordering

### Signed native call lifecycle

`POST /calls/native-event` is intentionally registered before router-wide `requireAuth`, because Android's native call-ended receiver may run while the application is killed. It requires a short-lived, call-scoped cryptographic token, rate-limits requests, loads the call record, checks that the token actor is one of the two participants, and only transitions an active call to a terminal state. Authenticated callers mint the token through `POST /calls/:callId/native-event-token`.

This is a deliberate signed capability boundary, not a generally public call API. Preserve the actor binding, expiry, call-state guard and one-way transition tests.

### Provider webhook raw-body handling

LiveKit and Paystack signatures are computed over raw request bytes. Their webhook routers are mounted before the ordinary JSON parser. Do not move them below `express.json()`, replace raw-body verification with parsed JSON, or accept provider event payloads as authoritative without provider-side verification.

### Shared prefixes

The LIVE event, stream and history routers share `/live`. Gifts, battles, captions, purchases, earnings and payouts have more specific prefixes. Keep explicit subresource mounts before any broad catch-all or parameterized route that could shadow them. Add route-order regression tests whenever a new `/live` mount is introduced.

## Cross-service trust and data flows

- **Messaging:** authenticated client service → conversations route for trusted multi-row writes; direct client Supabase access remains limited to operations whose RLS/data model explicitly supports it.
- **Calls:** authenticated caller → call-state/participant checks → LiveKit token or group-call admission; native OS lifecycle uses a signed, scoped token; push is an acceleration path, not the sole source of call state.
- **LIVE media:** authenticated stream/guest/moderator actions → stream membership and role checks → LiveKit room-admin service; signed Egress webhook → replay finalizer → private storage.
- **Gifts/PK:** authenticated viewer → server-side wallet debit and gift transaction → catalogue-defined score points → battle state; client-side score claims must never be authoritative.
- **Sparks purchases:** authenticated user → purchase initialization → Paystack → signed webhook verification → idempotent purchase fulfilment and receipt. Client success redirects do not credit a wallet.
- **Creator earnings/payouts:** gift ledger and reward rules → creator earnings ledger → eligibility/reservation → Paystack transfer → signed transfer webhook reconciliation. Pending transfer is not paid.
- **Refunds/disputes:** signed Paystack event → provider verification → risk ledger → freeze/release/revoke according to verified outcome; no automatic clawback of completed transfers.
- **Safety/discovery:** safety block/report and privacy-aware phone matching are distinct trust boundaries; do not expose raw contact books or service-role-only tables to clients.

## Required next checks

1. Verify every handler's effective authorization predicate, not just router middleware. Include owner/member/moderator, block relationship, audience, invitation status, call/stream state and resource ownership.
2. Add caller-context integration tests for allowed and denied actors, including non-member, blocked user, removed guest, expired invite, ended room, duplicate webhook and stale call.
3. Trace every route's input schema, request-size bound, rate-limit key, idempotency behavior, error mapping and provider timeout.
4. Map each route's table/RPC/storage writes to effective grants, RLS, constraints, triggers and SECURITY DEFINER call chains.
5. Verify background workers have durable claim/lease, retry and recovery semantics under the actual Render instance topology.
6. Add production observability for worker last-success, queue depth, expired leases, webhook verification failures, payout reconciliation and replay finalization.
7. Exercise the full flows with two accounts and multiple devices; CI/source checks alone do not prove production acceptance.

**Change-control:** This document records source topology only. It does not authorize production schema, grants, provider settings, payment activation, webhook-secret changes or deployment changes.
