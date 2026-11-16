# Royal Neon 5D screen redesign tracker

Source of truth: the current `src/navigation/AppNavigator.js` route declarations. The root stack contains 41 routes; the Main tab navigator contains five tab destinations. `Channels` is also a root route, so count screens by unique component/experience rather than adding route counts blindly.

## Current foundation

- [x] Theme provider extended with custom user palettes.
- [x] Royal Neon first-run palette and premium preset collection.
- [x] Contrast-aware dynamic primary/accent tokens in light mode.
- [x] Custom Signal, Thread and Highlight controls in Settings.
- [x] Specular/glow glass-card treatment.
- [x] Floating glass bottom navigation with reduced-motion-aware icon animation.
- [x] Chats camera shortcut and privacy-filtered Moments tray.
- [x] Palette-aware message composer send control.
- [x] Run frontend unit tests and release audits on the validated feature-branch head (13 Nov 2026).
- [ ] Verify custom-palette contrast on LIVE video overlays and call controls.
- [ ] Verify Android 10 / lower-powered device performance.
- [ ] Approve and merge the design foundation.

## Screen-by-screen implementation order

The order below preserves the agreed messaging-first sequence. A screen is not complete until its visual work, interactions, accessibility and regression checks are verified.

### Main navigation and messaging

- [~] Main — navigation container and floating glass navigation
- [~] Chats — Moments tray, camera shortcut, glass search and theme-driven filters
- [~] Chat — message timeline, bubbles, media and composer polish
- [~] NewChat
- [~] ForwardMessage
- [~] SavedMessages
- [~] Drafts
- [~] PinnedMessages
- [~] ChatFolders
- [~] SharedMedia
- [~] ChatAppearance

### Calls and live experiences

- [~] Calls
- [~] IncomingCall
- [~] OutgoingCall
- [~] Call
- [~] GroupCall
- [~] LiveHub
- [~] LiveStream

### Social and community

- [~] Updates
- [~] StatusUpdates
- [~] Channels
- [~] Polls
- [~] Events

### Profiles, groups and discovery

- [~] Profile
- [~] PeerProfile
- [~] EditProfile
- [~] CreateGroup
- [~] GroupManagement
- [~] JoinGroup
- [~] QRContact
- [~] ContactDiscovery

### Account, settings and support

- [~] Settings — theme presets and custom colour studio
- [~] PrivacySecurity
- [~] Notifications
- [~] DataStorage
- [~] DataExport
- [~] Sessions
- [~] Help

### Authentication

- [~] Onboarding
- [~] Login
- [~] Signup
- [~] VerifyEmail
- [~] PasswordRecovery
- [~] PasswordReset

### Additional route

- [~] ScheduledMessages

## Completion gates

1. Preserve all existing route names, data contracts, permissions and message/call behavior.
2. Every screen must support the shared dynamic palette and both light and dark appearance.
3. Keep text contrast, focus states, screen-reader labels and touch targets accessible.
4. Respect reduced motion; no continuous high-cost visual effects.
5. Test web export and native Android behavior; do not treat a web preview as proof of native calling/camera support.
6. No production deploy, database migration or PR merge without its own validation and approval.


## Latest implementation notes

- Additional contrast pass: dynamic foreground tokens now cover chat deletion and media send, contact matching, LIVE hub badges, missed-call history, story publishing, profile/group actions, account security, session revocation, export and authentication actions.
- Theme accessibility tests now exercise danger-action foreground contrast across every built-in palette in both Light and Dark appearance.
- Latest-head validation supersedes the earlier cancelled runs: the Premium status and LIVE quality workflow and Advanced calling client checks both passed on commit `73a292d` (13 Nov 2026). The run passed web export, Android Expo export, unit/call-recovery/native receiver tests, release/contract/integrity audits, Android Kotlin compilation, Android debug APK assembly and artifact upload, iOS prebuild, and the iOS CallKit end-event patch verification.
- The Android QA APK artifact `zannychat-royal-neon-android-debug` was successfully uploaded (artifact ID `14010614222`, seven-day retention). It is a debug build with placeholder Firebase configuration; it is not a production release and has not yet been installed/validated on a physical device.
- Route inventory is 41 root-stack routes plus five Main-tab destinations, with Channels shared between them: 45 unique navigation experiences. All screen component files (including web-specific call/LIVE screens) are covered by the shared-theme-hook contract test.
- The screen entries remain `[~]` until their individual visual, interaction, accessibility and regression validation is complete. Remaining external/device gates include Android 10 performance and physical-device call/camera/push checks; iOS prebuild and source-level CallKit patch checks are not a substitute for an iOS device build/test.
- The Figma design file was created, but its pages/components are still unpopulated because the Figma Starter-plan tool-call limit was reached. Do not represent the Figma handoff as finished.

- Contact discovery, LIVE hub badges, missed-call history, chat deletion, message deletion and media-send actions now consume dynamic theme danger/primary foreground tokens.
- Story publishing actions use the contrast-safe primary foreground; full-screen story media remains a dark cinematic stage so image/video content and white overlay controls remain legible.
- ScheduledMessages was verified to use the shared palette provider; interaction and accessibility regression checks remain open.

- Profile, peer profile and edit-profile action foregrounds now use contrast-safe theme tokens.
- Group creation, QR scanner and the authentication primary actions now use the selected palette's readable foreground token.
- Privacy/security destructive actions, session revocation and data export actions now use dynamic danger/primary tokens rather than fixed brand colours.
- Status updates, notifications, storage, export, sessions and help were inspected and already consume the shared theme provider; further interaction/accessibility validation remains open.

- Profile photo viewer close control retains a fixed white foreground on its intentionally black full-screen media stage; dynamic palette foregrounds remain applied to surrounding profile UI.

- GlassCard now skips live backdrop blur on Android API 30 and below while retaining the tinted surface, specular edge and elevation; Android 12+ and iOS keep the blur treatment. Physical Android 10 performance validation remains open.

## Screen-level accessibility audit — 13 Nov 2026

- Inspected all 46 screen implementation files (45 unique navigation experiences plus web-specific call/LIVE variants) for theme-context use, interactive-control semantics, declared touch-target dimensions and hard-coded colours.
- Raised undersized interactive targets to a 44-point minimum in StatusUpdates, Channels, Polls, ContactDiscovery, GroupManagement, LiveHub, NewChat and SharedMedia.
- Added a regression contract to keep the updated high-traffic controls at or above the 44-point target baseline.
- Earlier targeted fixes added explicit labels/disabled states to web LIVE actions, a larger accessible web group-call fallback action, and explicit Create Group selection/loading/error/empty states.
- The source audit is not a visual/device sign-off. Each of the 45 navigation experiences remains [~] until its visual layout, state transitions, accessibility and regression behavior are validated on supported platforms.
- Latest source commits are awaiting fresh CI after the touch-target matcher correction. Do not treat earlier workflow results as validation of these new commits.

- Follow-up accessibility pass: profile editing controls announce the active choice and upload busy/disabled state; Help support, call-history retry, drafts retry and Events publish/retry actions now have explicit accessible names and relevant disabled/busy state. Regression assertions cover these contracts.

- Further high-priority action audit: all interactive controls in the native LiveStream, LiveHub, GroupCall, Call, StatusUpdates and Chat screen files now expose explicit accessible names; Channels management, subscription, moderation, publishing, report and invitation actions were also labelled. Dynamic labels announce the target person/channel/report where appropriate.
- Regression assertions now cover native LIVE moderation/discovery, call fallback, channel management, status publishing/privacy and chat outbox/media recovery controls.
- These are source-level accessibility fixes and contract tests, not visual sign-off. The individual screen entries remain [~].

## Premium UI/UX audit continuation — 15 Nov 2026

- Created a dedicated audit branch `audit/premium-ui-ux-2026-11-15`; no production branch or deployment has been changed.
- Added `docs/PREMIUM_UI_UX_AUDIT_2026-11-15.md` with verified source findings, severity, current remediations and the screen-by-screen continuation plan.
- Refined the shared message composer: clearer theme-aware input surface, stronger but restrained border, 44-point input minimum, 42-point send control and a 96-point multiline cap.
- Added a ChatScreen contract test for composer surface contrast and proportion.
- Chats/Main and the remaining route inventory are still incomplete pending visual, interaction, accessibility and regression validation. The source-level audit must not be treated as device-level sign-off.

- NewChat contact results now use moderate divider-based rows instead of a glass card for every contact. The favorite action is a separate sibling control rather than a nested pressable, preventing the star action from unintentionally triggering the row's open-chat/share action. A dedicated regression contract was added.

- Chats filter chips now enforce a 44-point minimum touch height and centered content; a contract protects the target and selected-state accessibility.

- Chats header camera, drafts and new-chat actions are now 44×44; search has a 48-point minimum surface and the Moments “See all” action has a 44-point target. Regression assertions cover the dimensions.

- NewChat quick actions now wrap on narrow viewports rather than forcing all three cards into a single row; each action retains a 44-point minimum content height and a responsive width basis.


## Reconciled main-branch checkpoint — 2026-11-16

### Merged implementation baseline

- Frontend PR #71 merged: the signed-in user's profile avatar is used in the “My status” ring, with the story image as fallback.
- Frontend PR #86 merged: LIVE remote-track handling, server-issued role boundaries, creator/guest/viewer media stage, publisher state synchronization, viewer heartbeat and safer leave/end behavior.
- Frontend PR #89 merged: Creator Studio, explicit HOST/GUEST labels, creator-only participant snapshot, honest “Viewers listed” metric, moderator parity and mobile panel sizing.
- Frontend PR #90 merged: auth sign-out revocation marker now persists in Keychain/Keystore as well as AsyncStorage; reinstall simulation is covered by a regression contract.
- Frontend PR #91 merged: Crown Aurora shared design foundation, chat bubble/composer/glass/header refinements, responsive media sizing, notification opt-out persistence, privacy/account-deletion copy and contracts.
- Earlier stacked PRs #85 and #88 were closed as superseded after their non-conflicting changes were reapplied on current main. Their older LIVE header hunk was intentionally omitted because PR #86 already contains a newer scrollable management rail.
- PR #84 remains a draft for direct 1:1 LiveKit transport pending browser and physical-device audio/video acceptance.

### Current inventory — use this as the canonical count

- **48 unique navigation experiences**: 43 root-stack routes plus six Main-tab destinations, with Channels shared between navigators.
- **46 registered screen modules** and **49 screen implementation files** when platform-specific web call/LIVE variants are counted.
- The earlier 45-experience and 36-screen counts are superseded planning snapshots. Do not omit routes to fit the original 36-screen estimate, and do not count shared routes twice.
- All 46 registered screen modules have received a first-pass source review. This is not a visual, keyboard, accessibility, browser, or device sign-off.

### What is now implemented in the shared premium foundation

- Crown Aurora palette direction: void/deep navy, violet, cyan and restrained crown gold, while preserving the stable theme preference key and user-selected palettes.
- Shared GlassCard, Header, ChatBubble and InputBar refinements.
- Responsive media preview sizing and stronger composer hierarchy.
- Notification startup registration now respects persisted opt-out; token upsert/deletion outcomes are checked and the screen reports the real registration state.
- Privacy/security account-deletion copy requires recent authentication and explains reauthentication rather than implying a stale session is sufficient.
- Status avatar, high-priority 48-point hit areas, dark/light contrast and accessibility labels were previously addressed in the earlier screen passes.

### Current release/preview disposition

- PR #91's Premium status and LIVE quality workflow and Advanced calling client workflow passed; its Netlify preview succeeded.
- Vercel checks continue to fail because the team's build-rate limit is reached. This is an account/plan limit, not a failed application build. No Vercel production deployment is confirmed.
- PR #86/#89 merge does not replace two-account browser and two-physical-device acceptance. LIVE replay Egress-to-private-storage-to-playback remains unverified; production replay table currently has zero rows.
- Native auth hardening is in source, but production-configured Android/iOS binaries and reinstall/account-switching tests remain required.

### Next screen-by-screen implementation order

1. Main / Chats: story tray, chat list density, search, filters, pinned/archived states, loading/empty/error and bottom navigation safe area.
2. Chat: message hierarchy, reply/forward/edit/delete states, reactions, media, voice-note playback, composer/attachment sheet, keyboard and long-history scrolling.
3. New Chat: contact discovery, call/video actions, search, privacy-safe profile rows and invitation states.
4. Forward Message, Saved Messages, Drafts and Pinned Messages.
5. Chat Folders, Shared Media and Chat Appearance.
6. Status/Stories and privacy/audience flows.
7. Profile, peer profile, edit profile and account/security settings.
8. Call history, incoming/outgoing/direct/group call and LIVE screens.
9. Channels, events, polls, groups, discovery, support and utility flows.

Each screen remains incomplete until its real data and interaction states pass visual checks at 320/360/390/430 px, tablet and desktop widths; light/dark and user-selected palettes; keyboard-open and safe-area states; large text/reduced motion; screen-reader labels and touch targets; and supported-platform runtime checks. Do not substitute screenshots or design references for functional behavior.

### Additional security observation

The deployed web CSP in `vercel.json` and `netlify.toml` currently sets `frame-ancestors`, `base-uri` and `object-src`, but does not define `default-src` or `script-src`. It provides clickjacking/base/object restrictions, not a complete script-loading/XSS policy. A stricter CSP requires an allowlist based on actual Supabase, Render, LiveKit, OAuth and media origins and must be validated against the exported Expo web app before rollout.


## Screen implementation checkpoint — 2026-11-16

### Merged improvements since the previous tracker revision

- PR #93: Status composer drafts are account-scoped; switching accounts resets in-memory draft state before loading another account's record. Permanent account deletion clears the user's local drafts, pins, pending text/attachment outboxes, status draft and channel draft/recent-channel keys. This is local device cleanup; it does not claim E2EE or encrypted message outbox storage.
- PR #95: the Chats screen's story tray now renders privacy-aware contact profile photos rather than generic accent-only avatars. Identity comes from the authenticated conversation-profile directory; avatar visibility is resolved by `get_visible_profile_avatar_paths`; restricted photos are signed from the private avatar bucket for the current viewer. If a private avatar cannot be signed, the UI falls back to initials rather than an unverified public URL. Online dots use the live presence set.
- Both frontend quality workflows passed for PR #95. Its Netlify deploy preview passed. Vercel's check failed due the team's build-rate limit, not a source compile failure.

### Deployment configuration gate

- The Vercel team is reachable and is on the Hobby plan, but its project list is currently empty. Creating a replacement `zannychat` project through the connected API returned HTTP 403 (the current connection cannot create projects). No Vercel project/domain/deployment was created by this audit.
- The frontend repository already contains the correct Expo web build settings (`npm ci`, `npm run build:web`, output `dist`) and the public Supabase URL/publishable key plus Render backend URL are present in the existing EAS profile. The backend CORS allowlist already includes `https://zannychat.vercel.app`.
- A Vercel team owner/admin must create or grant project-creation rights before a production Vercel deployment can be completed. Do not upgrade the Hobby plan or spend money without explicit approval.

### Next screen-by-screen pass

The next interface implementation target is the Chat screen, followed by New Chat, Forward Message, Saved Messages, Drafts, Pinned Messages, Chat Folders, Shared Media and Chat Appearance. Keep the canonical 48 navigation experiences / 46 registered screen modules inventory; do not truncate work to the old 36-screen estimate. Each screen remains open until its real interaction states, responsive widths, keyboard/safe-area behavior, light/dark and custom palettes, accessibility and supported-platform runtime behavior are verified.
