# ZannyChat Premium Product Audit — 12 November 2026

## Audit scope and baseline

This review used the current GitHub default branches and the linked production Supabase project.

- Frontend: `Zanny001/zannychat-frontend`, default branch `main`, audited head `87c30f6cfa4b40d3ee71edce61c0e0be516a5800`.
- Backend: `Zanny001/zannychat-backend`, default branch `main`, audited head `7b49e9eee8d5a92ddb8c2896a33104a4302e1943`.
- Client: Expo SDK 57, React Native 0.86, React 19, Supabase JS 2.117, LiveKit React Native 3.1.
- Existing product foundation: direct and group messaging, voice/video calling, call history, Stories/status, creator LIVE, channels, polls, events, contact discovery, presence, saved/scheduled messages, chat folders, privacy controls and data export.
- Existing visual system: `src/theme/colors.js`, `ThemeContext.js`, `typography.js`, `fonts.js`; four mood palettes, light/dark/system appearance, high contrast and adjustable text size. This is an existing system and must be extended rather than replaced.

## Confirmed strengths

1. A distinct Signal & Thread brand idea, paired warm/cool conversation colors, custom Knot mark, Space Grotesk/Manrope typography and four mood palettes.
2. Theme state persists user-selected mood, appearance and accessibility preferences.
3. Core content surfaces already support pagination, request guards, drafts, moderation and privacy-aware visibility in several areas.
4. Stories use server-timed creation and privacy-aware audience selection; LIVE includes public/follower/private visibility and creator moderation flows.
5. The current main branch includes web LIVE startup feedback and validation. Premium Stories/LIVE work (PR #5) and Calls quick actions (PR #7) are merged.
6. The production database has RLS enabled on every inspected public table.

## Confirmed experience/design gaps

1. `ChatListItem` wraps every conversation in its own blurred, bordered, elevated GlassCard. This creates repeated visual containers and makes a high-density inbox harder to scan. Replace this with a calm, high-clarity conversation row and reserve glass surfaces for meaningful grouped surfaces or focal actions.
2. Shared components and screens still use many `TouchableOpacity` controls. Migrate incrementally to accessible `Pressable` interactions with visible pressed/disabled states; do not mass-rewrite all screens.
3. The bottom navigation is a custom absolute-positioned blur bar. Review its safe-area behavior, content overlap and touch targets on small Android devices and iOS before deciding whether to retain or platform-adapt it.
4. The five primary tabs are Chats, Calls, Updates, Channels and Profile. There is no dedicated, unified discovery/feed destination. Existing LIVE and Channels discovery can be surfaced more clearly, but do not fabricate content or bypass their visibility rules.
5. Some decorative globe/lock glyphs appear on every chat row. The product must not imply end-to-end encryption unless the protocol actually provides it; use explicit, accurate privacy language.
6. Screen-level visual consistency is uneven: the shared theme exists, but many screens still assemble their own spacing, controls and surface patterns. Prioritize shared primitives and migrate screen-by-screen.
7. Glass/blur and legacy shadow/elevation styling need device-performance and contrast checks, especially on lower-memory Android devices. Blur must remain decorative, never required for legibility.

## Supabase security and performance findings

### RLS and service-only tables

- RLS is enabled on all inspected public tables.
- The security advisor reports 28 RLS-enabled public tables with no policies. A privilege audit confirmed these tables have no table privileges for `anon` or `authenticated`; access is granted to `service_role` only. This is consistent with the backend-mediated design, not evidence that policies should be added indiscriminately.
- Do not expose these tables to clients or add broad policies simply to silence the advisor.

### SECURITY DEFINER functions

- The advisor flags 22 functions executable by authenticated users. A targeted review of the exposed RPC definitions confirmed authentication and/or conversation-membership checks in the reviewed functions, including contact directory, read-state, poll, event, message deletion, profile visibility, presence and call-heartbeat functions.
- These warnings still require a complete function-by-function authorization review. Keep intentional client RPCs; do not revoke them blindly because that would break app features.
- Functions with an empty search path must continue to schema-qualify referenced objects. Preserve fixed search paths and explicit authorization checks in all privileged functions.

### Remaining security action

- Supabase Auth leaked-password protection is currently disabled. Enable it in the Auth password security settings and test signup/password-change behavior. This is a dashboard configuration task, not a reason to weaken password validation in code.

### Performance advisor

- The advisor reports 66 unused indexes. Do not drop them based on this snapshot alone: many are recent feature indexes and may not yet have representative production traffic. Review query plans and workload history before any index removal.
- Continue measuring slow queries, pagination, media loading, Realtime subscriptions and Android memory/launch performance.



### Messaging encryption and privacy claims

- The current implementation provides authenticated participant access controls, RLS and transport/storage protections, but this audit did not find a verified end-to-end encryption protocol for message content.
- RLS and encryption at rest are not end-to-end encryption: privileged backend/service-role processes can access plaintext. Do not market chats as E2E encrypted or imply that the service cannot access message content.
- The onboarding sentence “Private — only you and them can open it” overstates the current security boundary. Replace it with accurate participant-access wording until an audited E2E protocol ships.
- A real E2E milestone requires an audited protocol/library, identity and device key lifecycle, forward secrecy, group key management, multi-device linking/revocation, encrypted media, encrypted backups, key-change warnings and interoperability/regression tests. Do not implement custom cryptography.

### Legacy profile/avatar compatibility risk

- `public.profiles` has an authenticated SELECT policy with `USING (true)`. The row includes `name`, `status`, `online`, `username` and the legacy `avatar_url`; RLS is row-level, not column-level.
- The `avatars` Storage bucket is still public. New avatar uploads are dual-written to both `private-avatars` and the legacy public bucket, and the profile retains the public URL for older clients. The migration explicitly preserves this compatibility path.
- The new `private-avatars` bucket is private and has a visibility-checking SELECT policy, but the legacy public URL can bypass those newer photo-visibility checks if it is known. This is a documented staged-cutover limitation, not something to "fix" by simply hiding the bucket: older installed clients may depend on those URLs.
- Before completing the privacy cutover, add a minimum-supported-client/version strategy, migrate every active profile to private paths, update all clients to resolve signed URLs, stop dual-writing public objects, clear legacy public URLs, then make the legacy bucket private only after compatibility telemetry confirms the old clients are retired. Test `everyone`, `contacts`, `nobody`, bidirectional blocks, own-profile access, and old-client behavior with two authenticated accounts plus an unauthenticated request.
- The private-avatars bucket currently has duplicate owner upload/update/delete and SELECT policies under two policy-name sets. Review and consolidate only after the staged cutover; avoid changing live access semantics during this product UI phase.


### Public content and creator-feed gap

- The current channel directory exposes public communities and channel posts, but `channel_posts` is text-only. LIVE is a separate broadcast experience.
- The current status table is intentionally ephemeral and contact-oriented: its audience constraint permits `contacts`, `only_me` and `selected_contacts`; it does not permit a public `everyone` audience. The separate profile preference's `status_audience` values include `everyone`, so this mismatch should be reconciled before exposing any public status feed.
- There is no persistent public creator-media feed comparable to a short-video discovery surface. Do not repurpose contact-only Stories or weaken `can_view_status` to fake one. A proper feed needs its own posts, creator follows, visibility rules, media storage/signing, comments, reactions, view accounting, reporting, moderation, pagination and abuse controls.
- Phase 2 should build that feed as a separate, opt-in creator product surface. Start with chronological public/following feeds and robust moderation; add ranking only after enough real engagement data exists. Never seed fake engagement or use private contacts as public recommendations.

### Storage guardrails

- The `chat-media` and legacy public `avatars` buckets currently have no server-side file-size limit or MIME allowlist. The new private-avatar bucket is capped at 10 MiB and status media at 50 MiB.
- Chat upload helpers do not enforce a shared byte-size ceiling before uploading. Establish explicit product limits and align frontend validation with Supabase bucket-level limits; the server-side bucket limit is authoritative because client checks can be bypassed.
- Choose accepted attachment MIME types from actual product requirements (images, voice notes, video, documents) before restricting the bucket. Do not accidentally block legitimate older clients or file types during rollout.

## Release and reliability gates

- Real APNs/FCM delivery, native CallKit/Telecom lifecycle behavior and cold-start call dismissal still require physical-device validation.
- LIVE and group calls require correctly configured LiveKit credentials and a reachable SFU; TURN relay connectivity also requires a real TURN service and network test.
- Browser camera/microphone, two-account calls, LIVE publishing/viewing and private media upload require authenticated end-to-end tests.
- The internal EAS APK build and device installation must be verified before treating Android native configuration as release-ready.
- No production deployment is authorized by this audit document.

## Implementation order

1. Improve the inbox row density, readability and accessibility without changing message, presence or favorite behavior.
2. Add shared accessible controls and document component contracts; migrate the highest-traffic surfaces first.
3. Refine the home/discovery information architecture using existing privacy-filtered LIVE and channel data. No seeded fake engagement or invented content.
4. Improve media presentation, creator surfaces, empty/loading/error states, and low-bandwidth behavior.
5. Run frontend unit/contract/release audits, web export and native prebuild/build checks.
6. Review Supabase policies and privileged functions with regression tests; apply only narrowly scoped, forward-only migrations where a verified defect exists.
7. Complete authenticated two-account and physical-device QA before any production release.

## Measurement discipline

Do not claim superiority over TikTok, WhatsApp, Snapchat or Telegram from source review alone. Track measurable outcomes: time-to-first-useful-screen, task completion, message send/receive reliability, call setup/answer success, LIVE join/publish success, crash-free sessions, accessibility checks, media load time and user retention.
