# ZannyChat Master Product, Architecture & Design Blueprint

**Status:** Living source of truth  
**Owner:** ZannyChat product and engineering  
**Canonical companion:** [Delivery Register](./ZANNYCHAT_DELIVERY_REGISTER.md)  
**Last reconciled:** 2026-11-19  
**Repositories:** `Zanny001/zannychat-frontend`, `Zanny001/zannychat-backend`

> This document is the durable project charter. Update it when scope, architecture, decisions, or acceptance criteria change. The companion register records execution status and evidence. Neither document may be marked complete from route presence, mockups, static code, or an unverified deployment alone.

## 1. Product mission

Build ZannyChat into a world-class, reliable, secure, accessible, cross-platform messaging and social communication product, with a distinctive **Crown Aurora** premium identity. The product should combine the practical breadth expected from leading messaging platforms with a coherent ZannyChat experience—not copy features blindly.

The transformation covers the complete product: information architecture, every registered screen and state, shared design system, frontend architecture, backend services, Supabase schema/RLS/storage, realtime, calls/LIVE, privacy/security, performance, accessibility, tests, operations, deployment and documentation.

**Non-negotiable working rules**
1. No scattered implementation: every requirement belongs in the companion register and a named feature/domain.
2. No duplicate work: inspect main, open PRs, merged PRs, existing services, migrations and production state before implementation.
3. Work in vertical slices: UI/UX + domain logic + API + data/security + tests + docs + operational evidence.
4. Preserve working features, six top-level destinations, real service-backed data, user content, existing contracts and backward compatibility.
5. Never ship fake data, decorative controls pretending to work, placeholder success, or a screen whose route exists but whose flows are incomplete.
6. Never claim a fix, test, migration, merge or deployment without tool/runtime evidence.
7. Use forward-only, reviewed database migrations. Never edit or rerun an already-applied production migration.
8. Keep costs at or near the user's stated ₦0 budget. Prefer existing/free-tier infrastructure; disclose unavoidable paid dependencies before adopting them.
9. Security takes priority over parity or visual convenience. No broad RLS policies, wildcard CORS, custom cryptography, or weakened authorization.
10. Complete screen families sequentially without skipping; record blocked work and dependencies instead of silently bypassing it.

## 2. Source-of-truth hierarchy and provenance

### Governing scope sources
- **Crown Aurora LIVE Design Audit** — retrieved from the user's supplied reference material. It specifies 18 LIVE experiences, 32 capabilities, design measurements, motion, safety and accessibility findings. Its visual prototype is a design reference, not proof of production functionality.
- **WhatsApp/Telegram parity scope** — the retrieved `WHATSAPP_TELEGRAM_PARITY_GAP_ANALYSIS.md` assesses a supplied source titled `WhatsApp and Telegram Screens and Functions.md` against frontend/backend source. The original titled source was not independently re-opened in this reconciliation. Preserve the gap analysis as the currently inspected evidence; retrieve the original source before making claims about details not contained in the assessment.

### Project evidence
- Existing frontend audit: `docs/ui-ux-premium-audit.md` (historical audit log; reconcile against current main before treating a checkpoint as current).
- Current source code, tests, migrations, workflow runs, production configuration and observed runtime behaviour.
- Companion execution register: `docs/ZANNYCHAT_DELIVERY_REGISTER.md`.

When sources conflict, do not silently overwrite either. Record the conflict, identify the more authoritative/current evidence, resolve it deliberately, and update both documents. Source requirements, implementation observations, design decisions and assumptions must be labelled distinctly.

## 3. Product experience and navigation

Preserve all six existing primary destinations:
1. Chats
2. Calls
3. LIVE
4. Updates
5. Channels / Explore
6. Profile

Do not remove or rename destinations simply to imitate a mockup. Secondary destinations remain discoverable through contextual navigation, profile/settings and feature-specific entry points. Keep navigation labels, selected state, back behaviour, deep links and Android hardware-back behaviour consistent.

The canonical screen review sequence begins with Main/Chats, then Chat, New Chat, Forward Message, Saved Messages, Drafts, Pinned Messages, Chat Folders, Shared Media and Chat Appearance; continue through every registered screen family in the register. The agreed full audit scope is **48 navigation experiences**. A current source parse on 2026-11-19 finds **47 unique screen modules imported** by `AppNavigator.js`, 48 RootStack.Screen declarations, 44 unique stack route names (including the `Main` tab-container route), and six primary tabs. Four route names are conditionally declared more than once. The earlier 46-module count is historical and stale; `LiveReplayLibraryScreen` is now present. The 48 experiences are the 44 unique stack route names excluding the `Main` container, plus the six tabs, with `Channels` counted once. Module count, declarations and experience count are distinct metrics.

### Canonical 48-experience inventory
1. Onboarding
2. Login
3. Signup
4. Verify Email
5. Password Recovery
6. Password Reset
7. LIVE Replay Library
8. Chats
9. Chat
10. New Chat
11. Forward Message
12. Saved Messages
13. Drafts
14. Pinned Messages
15. Chat Folders
16. Shared Media
17. Chat Appearance
18. Peer Profile
19. QR Contact
20. Contact Discovery
21. Create Group
22. Group Management
23. Join Group
24. Channels / Explore
25. Polls
26. Events
27. Calls
28. Incoming Call
29. Outgoing Call
30. One-to-one Call
31. Group Call
32. LIVE Hub
33. LIVE Broadcast
34. Updates / Status
35. Profile
36. Edit Profile
37. Settings
38. Privacy & Security
39. Notifications
40. Data Storage
41. Data Export
42. Sessions
43. Help
44. LIVE Replay
45. LIVE Creator Profile
46. Scheduled Messages
47. LIVE primary tab experience
48. Status Updates dedicated experience

This inventory is the agreed review coverage, not a claim that each item maps one-to-one to a unique module or route name. The six primary tabs remain Chats, Calls, LIVE, Updates, Channels/Explore and Profile.

## 4. Crown Aurora design system

### Visual identity
- Void navy foundation; raised navy/indigo surfaces.
- Violet for primary action and focus; cyan for presence, connection and selected states.
- Restrained crown gold for premium status and value—not routine decoration.
- Pale high-contrast primary text and clearly differentiated secondary text.
- Glass is a restrained material treatment with solid-tint fallback; never rely on blur for legibility or platform support.
- One deliberate glow/focal effect per screen. Premium means hierarchy, craft and consistency—not excessive gradients, blur or animation.

### Reference palette
The frontend audit's initial Crown Aurora values are: background `#070A1A`, raised surfaces `#0E1330` / `#161C42`, violet `#6A4DFF`, cyan `#38BDF8`, gold `#F3B94D`, primary text `#F4F5FF`, muted text `#A3ABD6`. The LIVE audit separately measures a prototype palette. These are related references, not automatically interchangeable tokens. Reconcile semantic tokens against contrast tests and current theme implementation before changing values.

### Layout and interaction principles
- Moderate, responsive containers; compact but breathable lists; deliberate whitespace.
- 44pt minimum interactive target (or equivalent hit-slop with accessible focus area).
- Stable 4pt spacing rhythm; consolidate radii and typography into shared tokens.
- Message bubbles and media previews must remain bounded and readable on narrow phones and large screens.
- Safe areas, keyboard avoidance, scrolling, bottom sheets, overlays and system bars must be correct.
- Every interactive control has a visible pressed, focused, disabled, loading and error state as appropriate.
- Respect system light/dark mode, high contrast, text scaling and reduced motion.
- Never place text directly over complex art without a legible backing surface.
- Avoid layout shifts, overlapping labels/actions, clipped content and tiny metadata.
- Maintain a solid-surface fallback on older Android devices (including Android 10/11).

### Required screen states
Every data-backed screen must explicitly handle: initial/loading, populated, empty, error/retry, offline/reconnecting, permission denied, stale/refreshing, and relevant success/disabled states. Destructive, privacy, payment and permission actions require confirmation and clear outcomes.

## 5. Full product capability scope

The following domains are the intended coverage map. The delivery register breaks them into verifiable slices.

### 5.1 Identity, onboarding and account
- Welcome/onboarding, sign-up, sign-in, email verification/OTP, password recovery/reset, supported OAuth.
- Profile, avatar, profile details, QR/contact sharing, account settings and account lifecycle.
- Session/device inventory, revoke sessions, secure account recovery and data export/deletion.
- Correct ownership isolation across all reads, writes, realtime subscriptions and storage access.

### 5.2 Core messaging
- One-to-one and group conversations; reliable inbox, pagination, search, presence, typing and unread state.
- Text, replies, edits, deletes, forwards, reactions, pins, saved messages, drafts, scheduled messages and delivery/read details.
- Attachments, images, video, audio, documents, voice recording, previews, upload progress, retry and recovery.
- Search across people, groups, content and messages with permission-aware results.
- Offline queueing, reconnect reconciliation, duplicate prevention, idempotency and clear delivery states.
- Message formatting and richer message types where explicitly scoped and tested.

### 5.3 Updates / Stories / Status
- 24-hour lifecycle and expiry enforcement.
- Audience selection, privacy lists, viewers, reactions, replies, muting and reporting.
- Secure media upload/playback, cleanup and correct contact visibility.

### 5.4 Groups and communities
- Group creation, invite links with expiry/limits, join requests, member roles and granular admin permissions.
- Group management, announcements, topics/forums, slow mode, admin logs and moderation.
- Community hierarchy and linked announcement spaces where the data model and UX are fully designed.

### 5.5 Channels and discovery
- Public/private channel discovery, follow/unfollow, posting, reactions, polls, views, comments/discussion groups, admin controls and protected content.
- Search, category/discovery ranking, pagination and abuse-resistant fan-out.

### 5.6 Calls and communication
- One-to-one and group voice/video calls, incoming/outgoing states, call history and participant management.
- Add/remove participants, switch audio/video mid-call, mute, speaker, camera, reconnect and call recovery.
- Real signaling and TURN/SFU media infrastructure; explicit network/device failure states.
- Screen sharing and call privacy controls only when platform/provider support and security are verified.

### 5.7 LIVE platform — 18 audited experiences
1. LIVE Hub
2. Creator Studio
3. Broadcast Room
4. Audio Room
5. Video Chat Room
6. Battles
7. Events
8. Replay Library
9. Replay Player
10. Creator Profile
11. Leaderboard
12. Gifts
13. Wallet
14. Analytics
15. Moderation
16. Guest Queue
17. Reports
18. Settings

Capabilities include discovery/categories, public/follower/private visibility, scheduling, live chat, reactions, up to five guests, guest invitations/approval, movable/resizable guest tiles, co-hosting, audio-only rooms, battles, gifting/wallet, replay recording and secure playback, analytics, moderation, reporting, blocking and notifications.

Preserve the established LiveKit integration, five-guest limit, guest permissions, moderator controls, comment/reaction behaviour, invitations, APIs, account isolation and replay access restrictions. The LIVE concept prototype is not production-connected proof. Replay source code, production replay rows, storage objects and successful playback are separate acceptance facts.

**Safety gates:** random video matching cannot ship without age assurance, explicit consent, blur-by-default, immediate report/block and evidence handling. Minors' safety is a release blocker. Wallet/gifting/payout flows require clear unit conversion, fees, payout rules, fraud controls and legal/payment review.

### 5.8 Advanced messaging/platform features
- Polls/quizzes, events, live location, view-once/self-destruct media, transcripts, silent/scheduled messages and rich formatting.
- Bots/API, Mini Apps, business automation/catalogues, paid media and subscriptions only after product, permission, abuse, legal and payment designs are approved. These are not to be represented as shipped because a route or menu exists.

### 5.9 Privacy, trust and safety
- Block/report, abuse prevention, rate limits, moderation workflows, evidence retention and appeal handling.
- Privacy controls, audience enforcement, safe discovery and user control over sessions/data.
- RLS, backend authorization and storage policy must agree. Validate cross-user access with at least two independent accounts.
- Audit sensitive RPCs, SECURITY DEFINER functions, search_path, grants, service-role boundaries and webhook authentication.

### 5.10 Encryption and backup
- Current RLS/private storage is not end-to-end encryption.
- Do not advertise E2EE until an independently reviewed protocol, per-device keys, identity verification, multi-device fan-out, key rotation/revocation, recovery and threat model are implemented and tested.
- Use established audited cryptographic libraries/protocols; never invent cryptography.
- Encrypted backup/restore requires a separate key recovery, portability and threat-model design. Database export is not encrypted chat backup.

## 6. Architecture principles

### Default architecture
Use a well-structured modular monolith unless measured scale or isolation needs justify a service split. Avoid premature microservices and unnecessary paid infrastructure.

### Frontend boundaries
Organise by product domains (auth, messaging, contacts, groups, status, channels, calls, LIVE, profile, privacy, notifications, data/export). Each domain owns its screens, components, hooks/state, API adapters, types, validation and tests. Shared platform layers own:
- design tokens/theme/accessibility;
- navigation/deep links;
- API client/auth/session;
- realtime subscription lifecycle;
- media upload/download/cache;
- offline queue/retry;
- error/result handling;
- analytics/logging/feature flags.

Avoid screen-to-screen business logic, duplicate API clients, unbounded collections, unstable list keys, and state that outlives its authenticated owner.

### Backend boundaries
Keep routes/controllers thin. Separate domain services, data access, authorization, validation, jobs/workers, provider adapters and observability. Make state transitions explicit and idempotent. Use request validation, bounded pagination, rate limits and structured errors. Provider-specific code (Supabase, LiveKit, push, storage, payments) must sit behind clear adapters.

### Data and security boundaries
- Supabase is the authoritative database/auth/storage platform currently in use.
- Define ownership, relationships, retention, indexes, uniqueness and deletion behaviour for each domain.
- RLS is deny-by-default for user data. Test both permitted and forbidden access.
- Private media remains private; signed URLs are short-lived and issued only after authorization.
- Avoid redundant schema/RPC changes. Inspect full migration history and production catalog before any migration.
- Secrets remain in managed secret stores; never commit them or print their values.
- CORS uses explicit trusted origins; no wildcard production origin.
- Keep service-role keys server-only. Validate webhook signatures and authorization context.

### Reliability and operations
- Instrument meaningful errors, latency, reconnects, upload failures and call/LIVE quality without logging private content or secrets.
- Health/readiness checks must distinguish process up, database reachable and dependencies ready.
- Background workers need observable schedules, retries, dead-letter/cleanup strategy and ownership-safe execution.
- Maintain backups and test restoration. Deployment and migration histories must be reconciled with source commits.
- Feature flags and rollback paths for risky releases.

## 7. Quality attributes and engineering standards

- **Correctness:** real server state, ownership isolation, idempotency and explicit state transitions.
- **Performance:** bounded lists, pagination, image/video sizing, caching, memory/network budgets, startup and interaction latency.
- **Accessibility:** screen-reader names/roles/states, focus order, contrast, text scaling, keyboard, reduced motion and touch targets.
- **Responsive:** narrow phone, common phone, large phone, tablet and desktop/web.
- **Compatibility:** supported iOS/Android versions; preserve older Android solid-tint fallback.
- **Security:** threat modelling for identity, media, realtime, calls, LIVE, payments and account lifecycle.
- **Maintainability:** domain boundaries, typed contracts, shared primitives, migration ledger and concise docs.
- **Localization:** prepare for locale/time-zone/number/currency formatting; never hardcode currency conversion or assume all users share a locale.

## 8. Definition of done

A feature/screen is complete only when all applicable conditions are met:
1. Requirement and source are linked in the delivery register.
2. UX flow and all required states are implemented; visual design follows shared tokens.
3. Real backend/data integration works; no mock data in production path.
4. Authentication, authorization, RLS, storage and privacy checks pass.
5. Loading, empty, offline, retry, permission and failure behaviour is correct.
6. Unit/contract/integration tests pass; two-account tests cover user isolation.
7. Accessibility and responsive checks pass on the target surfaces.
8. Logs/metrics and operational dependencies are understood.
9. Migration and rollout/rollback are reviewed when applicable.
10. PR is reviewed, CI is green, merged intentionally, deployed, and production smoke evidence is recorded.
11. The delivery register and this blueprint are updated with commit/PR/run/deployment evidence.

A concept, source implementation, merged PR, successful build, deployed commit and production-accepted feature are different statuses. Record them separately.

## 9. Delivery governance

- Work from the current main branch and reconcile all open PRs before starting overlapping work.
- Prefer one focused PR per coherent vertical slice; avoid parallel edits to the same screen/domain.
- PRs include scope, non-goals, risk, migration impact, tests, screenshots/device evidence and rollback plan.
- Never merge solely because a PR is old or the user said “continue”; merge when checks, review and release safety support it.
- After merge, pull current main locally before local verification. Deploy only through the established pipeline and verify the exact deployed SHA.
- Keep one active next task in the register. Update status/evidence immediately after every meaningful checkpoint.
- If a session ends, the next session starts by reading this blueprint, the delivery register, current GitHub main, open PRs, latest CI and production deployment state.

## 10. Current known project anchors

- Frontend: `Zanny001/zannychat-frontend`; local path `/root/zannychat-front`.
- Backend: `Zanny001/zannychat-backend`; local path `/root/zannychat-back-github`.
- Production frontend: `https://zannychat.vercel.app`.
- Production backend: `https://zannychat-backend-1.onrender.com`.
- Supabase project ref: `vithpppgyjmazxvogvno`.
- Android application ID: `com.zannychat.app`.
- Theme direction: Crown Aurora.
- Budget constraint: ₦0 target; disclose any paid dependency.
- Companion execution state: `docs/ZANNYCHAT_DELIVERY_REGISTER.md`.

These anchors must be re-verified before operational changes; they are not secrets and do not replace runtime configuration inspection.
