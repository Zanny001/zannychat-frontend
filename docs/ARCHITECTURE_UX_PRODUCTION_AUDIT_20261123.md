# ZannyChat Architecture, UI/UX and Connection Audit — 2026-11-23

**Status:** Active audit; not a world-class production sign-off  
**Repositories:** `Zanny001/zannychat-frontend`, `Zanny001/zannychat-backend`  
**Production database:** Supabase project `vithpppgyjmazxvogvno`  
**Purpose:** Establish an evidence-based architecture and experience baseline before further screen redesign or production changes.

## Executive decision

ZannyChat has a substantial and increasingly deliberate engineering foundation. It is **not yet defensible to certify the complete product as world-class, professionally organised and fully engineered**. The design system, navigation contract, backend route boundaries, service-role data model, call/LIVE services and monetization controls are meaningful foundations, but several completion gates remain open.

This is a source/catalog audit, not a full device, accessibility, penetration, load, or user-journey acceptance test. Passing CI and static contracts are not substitutes for those runtime proofs.

## What is already well-founded

- Six primary destinations are preserved: Chats, Calls, LIVE, Updates, Channels and Profile.
- The navigation source currently imports 59 imported screen modules, declares 60 root-stack screen entries and contains 56 unique root-stack route names. There are also six primary tab destinations. The four repeated root-route names (QRContact, JoinGroup, LiveStream and LiveReplay) are intentionally registered as unauthenticated placeholders and authenticated destinations; they must be counted as route variants, not four unrelated experiences. The source tree contains 62 screen JavaScript files because platform-specific web implementations are additional files, not 62 independent navigation screens. Conditional duplicate declarations mean route declarations, screen modules and user experiences must be reconciled rather than treated as equivalent counts.
- The Royal Neon/Crown Aurora direction defines theme presets, custom accent validation, semantic tokens, contrast handling, reduced-motion behavior and low-end Android blur fallbacks. It explicitly says screen-by-screen redesign and device validation are separate completion gates.
- The frontend has dedicated service modules and normalization between backend/Supabase rows and screen-facing models. This is a useful boundary, but the existing `src/services/api.js` still combines a broad range of concerns and imports many storage, auth, realtime, mock-data and backend dependencies. A complete dependency graph is not yet documented.
- The current backend entry point imports 26 route modules and mounts their routes across the health/diagnostics, chat, safety, discovery, calls, group calls, LIVE subdomains and provider webhook prefixes. This is newer than the earlier 16-module route-map snapshot; that older count must not be repeated as current. Protected business routers use authentication boundaries; internal routes use a shared secret; the LiveKit webhook verifies signed raw bytes.
- The Supabase model deliberately keeps many application tables service-role-only with RLS enabled and no client policies. This is a valid access model when effective grants and backend authorization remain verified; do not add blanket policies merely to silence the advisor.
- LIVE gifts and PK score changes are server-authoritative. Purchase-risk handling, receipts, reward accrual and payout reservations have explicit backend/database boundaries. Production purchase packages and payout activity remain disabled/empty pending commercial and provider readiness.

## Findings that prevent a world-class sign-off

### A. UI/UX and information architecture

1. **Screen inventory is not yet a reconciled experience architecture.** The 56 imported modules / 60 root-stack declarations / 56 unique root routes / six tabs must be reconciled against the older experience register and actual user journeys. Each screen needs a documented purpose, entry points, exit paths, access rules, data source, loading/empty/error states and owner.
2. **The design system is a foundation, not a complete redesign.** Token architecture and selected premium surfaces exist, but the design-system document itself leaves screen-by-screen redesign and device validation open. A palette and floating tab bar do not establish consistent hierarchy, spacing, density, accessibility, responsive behavior or interaction quality across every screen.
3. **Visual consistency and usability are not proven across the app.** No current full-screen visual regression matrix or representative Android 10/11, modern Android, iOS and web acceptance evidence was included in this audit.
4. **Navigation complexity needs an explicit route contract.** Nested flows, conditional duplicate route declarations, deep links, notification entry points, auth-required routes, back behavior and post-auth return paths need one traceable matrix.

### B. Frontend-to-service architecture

1. **The complete module-to-service graph is missing.** Existing architecture notes explicitly describe sampled dependencies, not a complete import graph. We cannot yet prove there are no duplicate network/state owners, screen-level direct database calls, inconsistent caching, or cross-domain dependency cycles.
2. **The central API/service boundary is broad.** `src/services/api.js` owns a wide compatibility/normalization surface and imports auth, notifications, storage, realtime, outbox, drafts, local mock data and backend/Supabase clients. This file should not be split mechanically: first map exported operations to domains, identify actual duplicate owners and preserve the stable screen-facing contracts.
3. **Request lifecycle behavior needs a unified contract.** The inspected `backendFetch` obtains the current session and performs fetch/JSON/error handling, but the implementation shown has no explicit request timeout. Before changing it, inventory long-running operations, cancellation callers, response formats and retry safety. Define bounded timeouts, cancellation, idempotency and error categories per operation rather than applying unsafe blanket retries.
4. **Real-data vs mock-data boundaries need release enforcement.** The service layer documents local mock mode for fresh checkouts. Production builds must fail closed or clearly surface missing configuration; they must never silently present mock records as real user data.

### C. Backend, database and provider connections

1. **Route-level authentication is not full authorization proof.** Every sensitive handler still needs a resource-level authorization trace: owner/member/moderator, blocked state, audience, invitation status, room state, and valid transition. Add caller-context tests for allowed and denied actors.
2. **Worker coordination is a material reliability gap to resolve.** The previous source review found process-local overlap guards across recurring workers. Some cleanup workers have no durable distributed claim/lease visible in source, notably account-storage cleanup, LIVE replay lifecycle and ended LIVE-room cleanup. This may be acceptable only under a proven single-process topology; scale-out or restarts can expose duplicate work or missed work. Map deployment instance count, lease/claim semantics, retry, last-success freshness and alerting before changing workers.
3. **Production liveness is not yet evidenced by source.** Logs and worker code are not proof that each worker is healthy. Add/verify observable last-success timestamps, queue depth, lease age, terminal failure counts and actionable alerts.
4. **CSP is incomplete.** Frontend headers include a restrictive CSP fragment with `frame-ancestors`, `base-uri` and `object-src`, but no `default-src` or `script-src`. Do not guess origins. Inventory Expo web, Supabase, Render API, LiveKit, OAuth, fonts and media; deploy report-only, test all critical journeys, then enforce with rollback.
5. **Database advisor notices require interpretation, not blanket fixes.** Current security advisor run reports 59 RLS-enabled/no-policy INFO findings. This is consistent with a growing service-role-only table set, but each table still needs effective-grant and route-owner verification. Performance advisor reports 89 unused-index INFO findings; do not drop indexes without workload/query-plan evidence.
6. **Payment and payout production readiness is intentionally gated.** No active Sparks packages or real purchase/payout rows were observed in the preceding production verification. Native Apple/Google virtual-currency billing, Paystack dashboard webhook setup, KYC/creator verification and real payout reconciliation remain launch gates. Do not activate packages, invent prices, credit fake balances or report pending transfers as paid.
7. **LIVE translation is not live speech translation.** Text translation capability must not be represented as microphone transcription or translated live audio until speech-to-text, consent, privacy, retention and cost controls are implemented and tested.

## Priority implementation sequence

### P0 — Establish one authoritative product architecture
- Reconcile all routes, screen modules, nested experiences, tabs, deep links and notification routes into a screen/journey register.
- Add per-screen contracts: purpose, primary action, data owner, permissions, loading/empty/error/offline states, analytics event and test coverage.
- Produce an actual frontend import/dependency graph and mark every network/data access by domain.
- Map every backend route to middleware, authorization predicate, service, table/RPC, provider, rate limit, idempotency and tests.

### P1 — Stabilize shared frontend connection contracts
- Inventory all exported `api.js` operations and group by domain before extracting anything.
- Define one request lifecycle contract for timeout, abort, session refresh, structured errors, safe logging, retryability and idempotency.
- Enforce production no-mock behavior and validate environment configuration at build/release time.
- Add integration tests for auth callback → session establishment → pending route restoration → protected destination.

### P2 — Reliability and security
- Complete handler-level authorization and caller-context tests.
- Resolve worker single-instance assumptions or implement durable database claims/leases where necessary.
- Add worker health/last-success and queue/lease observability.
- Inventory CSP origins, test in report-only, then enforce a least-privilege policy.
- Reconcile migration provenance and function ownership without rewriting production migration history.

### P3 — Screen-by-screen premium UX acceptance
- Apply Crown Aurora consistently without oversized cards, crowded headers or excessive glow.
- Test typography, contrast, touch targets, safe areas, keyboard behavior, screen readers, reduced motion and empty/error/loading states.
- Run screenshot/visual regression on the supported web and native device matrix.
- Complete critical journeys: sign-up/sign-in/recovery, inbox/message/media, group management, calls, LIVE viewer/creator/guest/moderator, wallet/gifts/PK, earnings/payout eligibility, safety and account deletion.

### P4 — Production readiness
- Run two-account and multi-device end-to-end tests against real services.
- Exercise provider webhook retries, duplicates, out-of-order events, refund/dispute, payout pending/failure/reversal, replay finalization and recovery.
- Keep purchase/payout entry points unavailable until all required platform, merchant, KYC and operational gates are genuinely ready.
- Complete load, accessibility, privacy and security acceptance before claiming world-class readiness.

## Current audit disposition

| Area | Assessment | What would close it |
|---|---|---|
| Brand and theme foundation | Established | Cross-screen visual consistency and device acceptance |
| Screen/navigation architecture | Partially mapped | Reconciled route/journey register |
| Frontend service boundaries | Partially established | Complete dependency graph and operation ownership |
| Backend route structure | Established at module level | Handler-level authorization and service/data trace |
| Supabase access model | Deliberate foundation | Effective-grant/function-chain review and advisor triage |
| Background workers | Implemented, reliability review open | Durable coordination or proven single-instance topology + alerting |
| LIVE/gifts/PK backend logic | Substantial foundation | Multi-account/device production E2E |
| Purchases/payouts | Gated, not launch-ready | Native billing/provider/KYC/operations acceptance |
| Translation | Text translation only | Consent-based speech-to-text pipeline for live captions |
| Overall world-class certification | **Not yet** | Close P0–P4 and pass production acceptance |

## Change-control rules

- No production schema, grant, RLS, storage, Auth, CSP, CORS, payment or worker change solely to make an audit metric green.
- No destructive index removal based only on an unused-index advisor.
- No blanket client access to service-role-only tables.
- No fake purchase, wallet, earnings, battle score, translation or payout data.
- Keep implementation changes small, tested, reviewed through PRs, merged, pulled locally, and only then deployed.
- Preserve the six primary navigation destinations and the approved Crown Aurora identity.

**Next concrete work item:** P0 route/journey reconciliation and frontend service dependency inventory, followed by P1 request lifecycle and auth-continuity fixes based on the resulting evidence.
