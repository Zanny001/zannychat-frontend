# ZannyChat premium UI/UX audit and implementation log

Updated: 2026-11-15 (handoff checkpoint 2)
Reference package: `ZannyChat-Ultra-Premium-Designs.zip`

## Design direction extracted from the supplied references

The nine 780×1688 screen references and editable HTML establish a visual direction called here **Crown Aurora**:

- Void background `#070A1A`, raised surfaces `#0E1330` and `#161C42`.
- Violet action/signal `#6A4DFF`, cyan thread/presence accent `#38BDF8`, crown gold `#F3B94D`.
- Pale text `#F4F5FF`, muted text `#A3ABD6`, subtle borders.
- Space should feel deliberate: compact but breathable lists, moderate message/media containers, floating but legible navigation/composer, and 44px+ touch targets.
- Use glass as a restrained material, not as a reason to blur every surface. Keep a solid tint fallback for older Android devices.
- Gold is a reserved premium cue. Keep glow to one deliberate focal action per screen. Animate only purposeful user actions and respect reduced-motion preferences.

The references are visual direction, not a specification for static copying. Their placeholder names, sample counts, fabricated activity, status-bar values, and mock interactions must never be shipped as real app data.

## Initial source inspection

Source files/components reviewed in this pass:
- `src/theme/colors.js`
- `src/theme/ThemeContext.js`
- `src/theme/typography.js`
- `src/components/GlassCard.js`
- `src/components/Header.js`
- `src/components/ChatListItem.js`
- `src/navigation/AppNavigator.js`
- `src/screens/ChatListScreen.js`
- `src/screens/ChatScreen.js`
- `src/screens/ProfileScreen.js`
- `src/screens/SettingsScreen.js`
- `src/screens/ChatAppearanceScreen.js`
- `src/screens/StatusUpdatesScreen.js`

### Findings and severity

| Severity | Finding | Evidence / action |
|---|---|---|
| Medium | The current default Royal Neon palette is close to the supplied direction but uses different background, violet, cyan, and gold values. | Updated the existing stable `royalNeon` key to Crown Aurora values; no preference-key migration is needed. |
| Medium | The supplied HTML describes five destinations plus a camera hub, while the app currently has six top-level destinations (Chats, Calls, LIVE, Updates, Channels/Explore, Profile). | Preserve all six destinations and Channels functionality; evaluate tab density and responsive alternatives before any navigation change. |
| Medium | Some profile and appearance surfaces combine multiple glow treatments. | Keep the one-focal-glow rule as the redesign standard; audit each use before removing effects. |
| Medium | Glass is intentionally disabled on Android API 30 and below; visual parity must come from solid surfaces, not relying on blur. | Retain and verify this fallback on Android 10/11. |
| Medium | The reference screenshots are single-size static mockups and do not prove keyboard, small-screen, tablet, scrolling, accessibility, or interaction behaviour. | Responsive and device verification remains an explicit release gate. |
| Review required | Status and chat overlays contain some fixed colour values in content that may appear above both light and dark app themes. | Inspect each overlay in context and replace only values that are not intentionally part of media/lightbox or LIVE stage treatments. |

### Existing strengths to preserve

- Theme preferences are persisted and include system/light/dark mode, custom palettes, text scaling, and high contrast.
- Shared Header and GlassCard primitives already centralise important presentation behaviour.
- Header title content has flexible width and truncation, and back/action controls have generous touch areas.
- Chat rows prioritise scanning, truncate long previews, expose unread counts, and support long-press actions.
- Chat composer includes attachment recovery, pending-message retry, media draft, and message-action flows; visual changes must preserve these states.
- Navigation respects reduced-motion preference for tab icon motion.
- The app's existing six destinations are all product functionality; do not remove a destination merely to imitate a mockup.

## Screen inventory and coverage status

The supplied audit names 46 screens. Status below distinguishes design-reference coverage from actual code/device verification.

| Screen | Reference coverage | Current audit status |
|---|---|---|
| AuthRequiredScreen | Welcome pattern | Source reviewed |
| CallHistoryScreen | Calls mockup | Source reviewed |
| CallScreen | Calls mockup | Source reviewed |
| ChannelsScreen | Chats/Status patterns | Source reviewed |
| ChatAppearanceScreen | Appearance mockup | Source reviewed |
| ChatFoldersScreen | Chats/Conversation patterns | Source reviewed |
| ChatListScreen | Chats mockup | Source reviewed |
| ChatScreen | Conversation mockup | Source reviewed |
| ContactDiscoveryScreen | Chats/Conversation patterns | Source reviewed |
| CreateGroupScreen | Chats/Conversation patterns | Source reviewed |
| DataExportScreen | Profile/Appearance patterns | Source reviewed |
| DataStorageScreen | Profile/Appearance patterns | Source reviewed |
| DraftsScreen | Chats/Conversation patterns | Source reviewed |
| EditProfileScreen | Profile/Appearance patterns | Source reviewed |
| EventsScreen | Chats/Status patterns | Source reviewed |
| ForwardMessageScreen | Chats/Conversation patterns | Source reviewed |
| GroupCallScreen | LIVE/Call patterns | Source reviewed |
| GroupManagementScreen | Chats/Conversation patterns | Source reviewed |
| HelpScreen | Profile/Appearance patterns | Source reviewed |
| IncomingCallScreen | Call mockup | Source reviewed |
| JoinGroupScreen | Chats/Conversation patterns | Source reviewed |
| LiveCreatorProfileScreen | LIVE/Call patterns | Source reviewed |
| LiveHubScreen | LIVE mockup | Source reviewed |
| LiveReplayScreen | LIVE/Call patterns | Source reviewed |
| LiveStreamScreen | LIVE/Call patterns | Source reviewed |
| LoginScreen | Welcome mockup | Source reviewed |
| NewChatScreen | Chats/Conversation patterns | Source reviewed |
| NotificationsScreen | Profile/Appearance patterns | Source reviewed |
| OnboardingScreen | Welcome mockup | Source reviewed |
| OutgoingCallScreen | Call mockup | Source reviewed |
| PasswordRecoveryScreen | Welcome pattern | Source reviewed |
| PasswordResetScreen | Welcome pattern | Source reviewed |
| PeerProfileScreen | Profile/Appearance patterns | Source reviewed |
| PinnedMessagesScreen | Chats/Conversation patterns | Source reviewed |
| PollsScreen | Chats/Status patterns | Source reviewed |
| PrivacySecurityScreen | Profile/Appearance patterns | Source reviewed |
| ProfileScreen | Profile mockup | Source reviewed |
| QRContactScreen | Chats/Conversation patterns | Source reviewed |
| SavedMessagesScreen | Chats/Conversation patterns | Source reviewed |
| ScheduledMessagesScreen | Chats/Conversation patterns | Source reviewed |
| SessionsScreen | Profile/Appearance patterns | Source reviewed |
| SettingsScreen | Profile/Appearance patterns | Source reviewed |
| SharedMediaScreen | Chats/Conversation patterns | Source reviewed |
| SignupScreen | Welcome mockup | Source reviewed |
| StatusUpdatesScreen | Status mockup | Source reviewed |
| VerifyEmailScreen | Welcome pattern | Source reviewed |

## Implemented in this pass

- Updated the existing default `royalNeon` palette to the Crown Aurora values while preserving its key, so stored theme selections remain valid.
- Added contract tests for palette identity, semantic text contrast, outgoing bubble contrast, and shared touch/spacing tokens.
- Softened shared GlassCard material: 24-point default blur, stronger surface tint, and a subtler specular highlight; the Android 10/11 solid-tint fallback remains intact.
- Standardized shared Header action spacing and marked the screen title as an accessibility header.
- Fixed a concrete LIVE usability defect: creator/moderator action controls previously shared one crowded row with the LIVE badge and title, which could overlap on narrow phones. The title/leave controls now occupy a compact first row and management actions use a horizontally scrollable, labeled 44px+ action rail. The stage reserves space for this rail while retaining bounded 16:9 video tiles.
- Added `LiveStreamHeaderLayout.contract.test.js` to guard the horizontal action rail, accessible controls, touch targets and bounded video aspect ratio.
- Replaced fixed chat image/video preview dimensions with viewport-aware bounds: square image previews and 16:9 video previews scale for narrow phones and cap at moderate desktop widths. Added unit tests for 280–430px phones, missing width and large viewports.
- Expanded the contrast contract to exercise every selectable mood in dark/light appearance and normal/high-contrast accessibility modes, checking text on background, raised surface and alternate surface, plus primary/accent labels and outgoing bubbles.

## Handoff checkpoint — 2026-11-15

### Completed so far
- PR #85 (`design/crown-aurora-premium-system`) is the active, draft-only implementation branch.
- The Crown Aurora default palette is implemented in `src/theme/colors.js`; the persisted `royalNeon` key is unchanged to preserve existing user preferences.
- The reference's six-position navigation concept has been reconciled with the app's six existing destinations. No destination or feature is removed.
- The source review in this first pass covers the theme provider/tokens, typography, shared glass/header/chat-row components, navigation, Chats, Chat, Profile, Settings, Chat Appearance and Status Updates.
- The supplied HTML's sample people, counters, timestamps, and fake activity are treated as mockup-only and must not replace live service data.
- The premium contrast contract now covers all selectable palettes, light/dark modes and high-contrast modes. Commit: `35857cec5420d0fef8617aa66c608a8b4f98395a`.
- Shared component commits: GlassCard `e253394dd5fe48c7689ffbff7109a1253eae16dd`; Header `59ff049eea61cab959b18f78ebd7e1e851043033`. LIVE header fix `2453b235852cac805b44366ee7340c7ae7ea5696`; layout contract `183f49f6c7261016739922389d00cb32cd805321`. Responsive media sizing `18aa75536b85827ca81ad13d80b2e19edc5943bd`; sizing utility `d78862dafb3008531c6b75e250e31cfb849a1dee`; unit tests `aa5e87b3b40d53464c19832074550af5ea3493f8`.
- Previous PR #85 baseline workflows passed: Advanced calling client checks and Premium status and LIVE quality. Netlify preview check and Vercel check were successful for commit `428c11c04c29371886e98882dc76f2fc8facd03e`. The new expanded test commit still requires fresh CI confirmation.

### Next exact steps
1. Confirm CI for `35857cec5420d0fef8617aa66c608a8b4f98395a`; repair any theme/mode contrast regression before adding more visual changes.
2. Review the shared Header/GlassCard and LIVE header refinements in CI and visual previews; then continue the 46-screen audit in route groups: authentication; messaging and chat utilities; calls/LIVE/replay; profile/settings/privacy/data; channels/events/notifications. Record each screen's actual implementation, modal/action-sheet states, empty/loading/error states, and test evidence.
3. Prioritise shared primitives and high-traffic screens before one-off polish: header/action spacing, glass surface fallback, tab bar, conversation rows, composer, message bubbles, profile cards, status/LIVE overlays.
4. Add or extend focused contract tests alongside each shared component/screen change. Run unit, release, readiness, integrity, and web-export checks after implementation waves.
5. Perform responsive browser checks at narrow phone, 390px reference, large phone, tablet and desktop widths; verify keyboard/scroll and light/dark/high-contrast/text-scale combinations.
6. Perform physical-device QA on Android 10/11 and a modern Android device. Do not claim blur, animation, camera, microphone, media, or navigation quality without runtime verification.
7. Review backend/Supabase dependencies before any data/schema/policy/function change. This design phase has no identified Supabase requirement; keep the database untouched unless a concrete dependency is found.
8. Keep PR #85 draft and do not merge/deploy until the implementation and relevant checks are complete; production hosting is separately constrained by deployment quotas and is not implied by CI.

### Outstanding / not verified
- The remaining screen source reviews and all per-screen interaction/state audits.
- No visual screenshot comparison, responsive browser run, physical-device review, or keyboard/accessibility acceptance has yet been completed for this design pass.
- No Supabase migration, production deployment, or merge has been performed for this design pass.


## Route inventory verification — 2026-11-15

A fresh source pass parsed the registered screen imports in `src/navigation/AppNavigator.js` and confirmed **46 distinct screen modules are registered and their source files are present**. This confirms route/source presence only; it does not mean every interaction or visual state has been accepted.

The source scan covered these families:
- Core and authentication: onboarding, sign-in, sign-up, recovery, reset, verification and auth-required.
- Messaging and social: chat list/conversation, new chat, contact discovery, groups, peer profile, forwarding, saved/drafts/pinned/scheduled messages, folders, shared media, channels, polls and events.
- Calls and LIVE: call history, incoming/outgoing/direct/group call, LIVE hub, stream, replay and creator profile.
- Account and support: profile/edit profile, settings, privacy, notifications, data/storage/export, sessions, appearance, help and QR contact.

### Static review signals (not automatic defect classifications)

- The six high-traffic source areas reviewed earlier use the shared theme and component system; no new navigation route or feature is required to render the supplied visual direction.
- Several utility screens have low counts of explicit accessibility annotations in a static scan. This is a review signal, not proof of inaccessible controls: native control semantics and parent labels also count. The next pass must test actual focus order, labels, selected/expanded/disabled states and screen-reader output.
- Fixed dimensions and absolute positioning are concentrated in media, call, LIVE and avatar/illustration treatments. They must be reviewed against actual container bounds and device widths before changing them; fixed dimensions are not defects by themselves.
- Literal colours are concentrated in immersive call/LIVE/media contexts. Preserve intentional media-stage colours while auditing all app-chrome overlays for theme correctness.
- No database dependency was found in the Crown Aurora visual-token and shared-presentation changes. Do not change Supabase schema or policies merely to match static mockup content.

### Implementation wave status

| Wave | Scope | Status |
|---|---|---|
| 0 | Extract reference tokens and principles; preserve all six existing destinations | Done |
| 1 | Crown Aurora default palette and cross-theme contrast contract | Implemented; expanded test commit awaits fresh CI confirmation |
| 2 | Shared navigation/header/surface/composer refinement | Pending implementation and regression tests |
| 3 | Chats, Chat, New Chat, message utilities and media | Source inventory present; detailed visual/interaction pass pending |
| 4 | Calls, LIVE, replay and creator profile | Source inventory present; detailed visual/device pass pending |
| 5 | Auth, profile, privacy, settings, data and support | Source inventory present; detailed visual/interaction pass pending |
| 6 | Responsive, accessibility, keyboard, theme matrix and physical-device acceptance | Pending |

## Verification and release gates

- Automated verification is pending CI for this branch.
- No Supabase schema, function, RLS policy, or data changes are part of this UI-only phase.
- No deployment is claimed.
- Full audit completion is not claimed. Remaining work includes source review of all pending screens, modal/drawer/action-sheet states, small/large phone and tablet layouts, keyboard/scroll behaviour, theme contrast across every surface, and real-device QA (including Android 10/11).


## CI and preview checkpoint — 2026-11-15 (latest commit 1436467795eae3093c741668e3ca4ff15a17d8a0)

### Verified on this commit
- `Premium status and LIVE quality` workflow run 634 completed successfully. Its frontend-quality job passed `npm ci`, Expo web export, Expo Android export, unit tests, call-recovery tests, native call-receiver tests, release audit, contract audit, and integrity tests.
- `Advanced calling client checks` workflow run 824 is still in progress at this checkpoint. npm dependency vulnerability audit, Expo config/prebuild for Android, and Android `compileDebugKotlin` completed successfully. The compile-only APK assembly step was still running; later artifact verification, iOS prebuild/CallKit verification, web/Android exports, and further tests were pending. Its placeholder-Firebase APK is explicitly not suitable for installation or device QA.
- Commit status checks report Netlify deploy-preview success and Vercel success. These are preview/check statuses only; they do not establish a production deployment or production-domain cutover.
- Pull request review-thread query returned no inline review threads at this checkpoint.
- PR #85 remains draft and unmerged.

### Current changed-file scope
- `docs/ui-ux-premium-audit.md`
- `src/components/ChatBubble.js`
- `src/components/GlassCard.js`
- `src/components/Header.js`
- `src/screens/LiveStreamHeaderLayout.contract.test.js`
- `src/screens/LiveStreamScreen.js`
- `src/screens/PremiumDesignSystem.contract.test.js`
- `src/theme/colors.js`
- `src/utils/mediaPreviewSizing.js`
- `src/utils/mediaPreviewSizing.test.js`

### Next steps / release gates
1. Poll workflow run 824 until completion; inspect and repair any failing step, then record its final result.
2. Continue detailed source and interaction audits for the remaining 46 registered screens in route families; route presence is not acceptance evidence.
3. Continue shared Header/navigation/composer and chat utility visual refinement with focused tests; preserve all six navigation destinations and all existing product behaviour.
4. Review responsive previews and actual browser layouts at phone/tablet/desktop widths, then test keyboard, focus order, screen-reader labels, reduced motion, light/dark/high-contrast and text scaling.
5. Perform real-device QA on Android 10/11 and a modern Android device. The CI placeholder APK is not an installable QA artifact.
6. Keep PR #85 draft until all required automated checks and relevant QA gates pass. Do not merge or claim production deployment from preview statuses.
7. No Supabase changes are indicated by this UI-only pass; keep schema, functions, RLS and production data untouched absent a concrete verified dependency.

### Outstanding / not verified
- Final result of calling workflow run 824 at this checkpoint.
- Full per-screen source, visual and interaction audit; modal, drawer, empty, loading and error states.
- Physical-device and keyboard/accessibility acceptance.
- Production deployment and production-domain verification.


## Calls and LIVE source-review checkpoint — 2026-11-15

### Screens/source modules reviewed in this pass
- `NewChatScreen.js`: reviewed member search debounce/cancellation, public-profile search, favorites persistence, presence filtering, retry/error handling, conversation creation, call-start handoff, call-history redial target handling, and contact sharing.
- `CallHistoryScreen.js`: reviewed quick audio/video/favorites actions, per-user call-history deletion semantics, 1:1 redial via New Chat, and group redial via GroupCall. The group redial path starts a fresh room from the conversation ID; it does not reuse a stale room token.
- `CallScreen.js`: reviewed native audio-session lifecycle, direct-call state validation, remote track handling, conference promotion, cleanup and before-remove end-state persistence. Full signalling, network-recovery and runtime verification remain separate gates.
- `GroupCallScreen.js`: reviewed room join/create selection, participant state, heartbeat, reconnect/disconnect state, mute/camera controls, audio output selection, invitation capability gating and leave cleanup.
- `IncomingCallScreen.js` and `OutgoingCallScreen.js`: reviewed expiry timers, tone/vibration cleanup, answer/decline/cancel paths, native-call handoff and terminal-state navigation.
- `LiveHubScreen.js`: reviewed discovery/following/invitations, private invite validation, camera/microphone permission request from the Go LIVE action, stream creation, stable stream-ID navigation, replay polling/deletion and notification handoff.
- `LiveReplayScreen.js`: reviewed authenticated playback URL retrieval, player cleanup, retry, bounded 16:9 presentation and creator-only delete affordance.
- `LiveCreatorProfileScreen.js`: reviewed separate creator identity, backend-sourced metrics, broadcast/replay collections, and delete flows for ended broadcasts and individual replays.

### Findings / follow-up
- No confirmed source-level blocker was identified in these paths from this static review alone. The existing call and LIVE flows contain explicit loading/error/expiry/cleanup paths and should be preserved during visual changes.
- Group call history redial is intentionally conversation-based and requests a new group room; direct-call redial routes through New Chat with a stable target user ID.
- Creator broadcast deletion and replay deletion are distinct actions. The creator profile removes associated replay rows from its local summary after a broadcast delete; the server remains authoritative for file cleanup and access control.
- These are source-review observations, not proof of successful camera/microphone permissions, media playback, LiveKit connectivity, call audio, notification handoff or physical-device behaviour.

### Latest CI disposition
- Workflow run 824 (`Advanced calling client checks`) was subsequently cancelled during `Assemble Android compile-only APK (placeholder Firebase)`. The preceding npm audit, Expo config/prebuild and Android Kotlin compile steps succeeded. APK assembly and all subsequent iOS, export and test steps were cancelled/skipped. Treat this workflow as **not passed**.
- Workflow run 634 (`Premium status and LIVE quality`) remains successful for commit `1436467795eae3093c741668e3ca4ff15a17d8a0`.
- The documentation-only checkpoint commit `e5fcdb9c1d98c1a4ebd12e31d9f74a82d7d43d5b` reports Vercel build-rate-limit failure and a pending Netlify deploy preview at the time checked. Do not interpret the previous commit's green preview checks as checks on this latest commit.

### Remaining
- Continue source review for the other registered screens and all secondary states; do not mark all 46 screens audited yet.
- Re-run or repair the cancelled calling workflow and complete all its remaining checks.
- Complete visual/browser/device QA and accessibility/keyboard acceptance.
- Keep PR #85 draft and unmerged; no production deploy or Supabase mutation is part of this pass.


## Profile and messaging utility source-review checkpoint — 2026-11-15

### Reviewed in this pass
- `EditProfileScreen.js` and the `updateProfile` service path: the UI normalizes username input, validates the allowed 3–24 character format, writes identity fields, then re-reads the current profile and verifies the returned name/status/username before reporting success. The form updates its local values from the confirmed response. Additional profile details save separately and the UI explicitly reports partial success if that second operation fails.
- `ProfileScreen.js`: reviewed profile data refresh on focus and LIVE impact retrieval/error handling.
- `StatusUpdatesScreen.js`: reviewed focus refresh and owner-side delete action; detailed story composition, viewer, reaction and privacy-state review remains pending.
- `SharedMediaScreen.js`: reviewed media grid/open-preview interaction and failed-photo retry state; full media-type, pagination, empty and access-error review remains pending.
- `DraftsScreen.js`: reviewed focus refresh, unavailable-conversation handling and delete failure feedback.
- `ScheduledMessagesScreen.js`: reviewed focus refresh path; scheduling/edit/cancel/delivery edge cases remain pending.

### Finding relevant to the reported username persistence issue
- The current branch contains a read-after-write confirmation in `src/services/api.js:updateProfile`: after updating the authenticated user's profile row, it calls `getCurrentUser()` and rejects the save if the returned identity does not match the requested values. `EditProfileScreen` only displays the saved state after this confirmation. This is a meaningful source-level safeguard, but it does not replace an end-to-end test that edits a username, leaves the screen, reopens the app/session, and verifies the persisted value from the server.

### Status
- No new confirmed defect was established in this limited source pass. Static review is not a substitute for exercising server permissions, data persistence, media permissions, offline/retry states, and accessibility with real accounts/devices.
- The 46-screen inventory remains only partially reviewed; no claim of full audit completion.


## Latest action — calling CI retry requested

- The cancelled `client-quality` job from workflow run 824 was successfully queued for rerun via GitHub Actions (new job ID `132990314246`). It had previously passed npm audit, Android Expo prebuild and Android Kotlin compilation before cancellation during compile-only APK assembly.
- The retry is queued, not yet passed. Check the rerun before changing the PR's readiness state.
- Latest known commit before this note: `5b748e0ecfe24d9fef1360236b28c153332982c4`. Vercel reports build-rate-limit failure for that commit. No production deployment is confirmed.


## Authentication, groups, social and account settings source-review checkpoint — 2026-11-16

### Additional screens reviewed
- Authentication and account entry: `AuthRequiredScreen`, `OnboardingScreen`, `LoginScreen`, `SignupScreen`, `PasswordRecoveryScreen`, `PasswordResetScreen`, and `VerifyEmailScreen`. Reviewed input semantics, loading guards, Google OAuth cancellation, generic password-recovery messaging, six-digit email OTP, resend, password-reset expiry messaging and auth-state navigation handoff.
- Contact and groups: `ContactDiscoveryScreen`, `QRContactScreen`, `CreateGroupScreen`, `JoinGroupScreen`, `GroupManagementScreen`, and `PeerProfileScreen`. Reviewed permission gates, contact selection/privacy discoverability, QR scanning and invalid-code handling, group invite acceptance/revocation, membership/admin actions, metadata limits, profile quick actions and media navigation.
- Messaging utilities and social: `ForwardMessageScreen`, `SavedMessagesScreen`, `PinnedMessagesScreen`, `ChatFoldersScreen`, `ChannelsScreen`, `EventsScreen`, and `PollsScreen`. Reviewed route handoffs, pagination/load-more, create/update/delete/vote/RSVP actions, invite controls, local-only bookmark/draft semantics, empty/error/retry states and accessibility labels on key controls.
- Account and support: `PrivacySecurityScreen`, `DataStorageScreen`, `DataExportScreen`, `SessionsScreen`, `HelpScreen`, `ChatAppearanceScreen`, and `NotificationsScreen`. Reviewed account reauthentication and delete confirmation, session sign-out scope, personal-data export and share fallback, persisted local data controls, notification/quiet-hours settings, support contact handling and theme selection.
- `LiveStreamScreen` was revisited for the creator/moderator action rail, stage overlays, floating reactions and guest controls.

### Confirmed design / product observations
- Account deletion is deliberately gated by exact `DELETE` confirmation and provider-appropriate ownership verification; it requires live Supabase and backend configuration. Keep this guard intact during UI redesign.
- Personal data export requires a signed-in live account, pages message data in bounded batches, and excludes actual attachment files/private media URLs as described in its UI. It writes to temporary app storage and uses the platform share sheet; unsupported sharing is surfaced as an explicit error.
- Saved-message removal is a local bookmark action and does not delete the original conversation message. Pinned-message removal unpins only. Draft deletion removes unsent local text only. These distinctions must remain clear in confirmation copy.
- Group member/admin operations and invitation lifecycle are separately confirmed with server-backed actions; keep role, revoke, remove and leave confirmation semantics.
- Events and polls include explicit migration-related errors. Their functionality must be validated against the production schema before claiming those features are live; no schema changes were made in this design pass.
- QR scanner has a 300px camera frame and 190px guide. Validate small-device safe-area/viewport fit and camera permission UX on hardware before changing the scanner layout.

### Follow-up risks / not yet verified
- Notification settings persist the local master preference before invoking push-token register/unregister. The notification service intentionally catches expected permission/device/configuration failures and returns null, so a user can see the master preference enabled even when no push token is actually registered. This is a clarity/observability risk: UI should distinguish “preference enabled” from “push token successfully registered” and report permission/registration state without pretending the push service succeeded. No change made yet because this requires a coherent device-token state model and tests.
- Browser notification permission is controlled by the browser; the app cannot silently revoke it. Preserve the explanatory copy and validate permission-denied/granted states in supported browsers.
- Several account and auth screens use native `Alert` for confirmation/feedback. On web, confirm that the platform-specific alert implementation is consistent and keyboard-accessible; this static review did not test browser dialogs.
- Events/Polls are conversation-scoped and their UI references specific migration versions in error copy. Confirm deployed migration state and RLS in a separate backend audit before production sign-off.
- OAuth redirect, password reset, OTP, camera/QR, contact permissions, push registration, share sheet, session revocation and account deletion have not been exercised end-to-end with real accounts and devices.
- Static review is not visual acceptance. All screen modules are now source-reviewed to a first-pass level, but each still needs systematic responsive visual and interaction-state QA; “source reviewed” does not mean “fully accepted.”

### Updated coverage status
- All 46 registered screen modules have now received at least a first-pass source review, including the additional groups above and the previously reviewed core Chats/Profile/Settings/Appearance/Status areas.
- This closes the initial source-inventory pass only. It does **not** close per-screen modal/action-sheet/empty/loading/error state testing, responsive screenshots, keyboard/focus traversal, screen-reader verification, reduced-motion verification, real-device call/LIVE/QR/push testing, or backend schema/RLS acceptance.
- No Supabase migration, production deploy, or merge was performed in this checkpoint.


## Shared chat composer refinement — 2026-11-16

### Implemented
- Updated `src/components/InputBar.js` to replace the oversized pill-shaped message field with a moderately rounded (20px), solid raised-surface input container, stronger theme-derived border, 52px minimum container height and 14px horizontal inset. This addresses the prior visual feedback that the composer container looked unattractive while improving surface definition and legibility.
- Preserved the existing attachment, emoji, multiline text, voice recording, reply, edit, local draft restore/save, and failed-send text-retention behaviour. The composer remains horizontally flexible for narrow screens; the 48px action controls remain unchanged.
- Expanded `PremiumDesignSystem.contract.test.js` with a composer contract checking the surface treatment, minimum height, accessible input label, and core draft/reply/edit/recording code paths.

### Verification
- The GitHub Contents API confirms the updated source and contract test were committed to the PR branch. This environment has not run the Node test suite locally. No new GitHub Actions run was returned for the latest commit at the time of this checkpoint.
- Vercel continues to report build-rate-limit failure. A successful production or preview deployment is not established.

### Audit bookkeeping
- Confirmed the screen inventory table has no remaining rows marked `Pending source review`. All 46 registered screen modules have at least a first-pass source review logged.
- This is not the end of acceptance: all 46 still require responsive screenshot review, keyboard and focus traversal, modal/sheet and state coverage, accessibility output, reduced-motion checks and physical-device verification.
- Notification push preference remains a follow-up: the local preference can be enabled while registration returns null (for example, permission denied, simulator, or missing EAS project). The UI should distinguish desired preference from successfully registered device token state. No notification-service behavior was changed in this pass.
- The calling CI job retry was cancelled again during `npm ci`; no complete calling workflow pass is available. Treat it as an unresolved CI blocker.


## Confirmed privacy UX defect fixed — 2026-11-16

- Source review found a copy/expiry mismatch in Google account-deletion reauthentication: the implementation sets `ACCOUNT_DELETE_REAUTH_TTL_MS` to ten minutes, but two user-facing instructions said five minutes.
- Updated both instructions in `PrivacySecurityScreen.js` to say ten minutes, matching the actual expiry.
- Added a regression assertion to `PrivacySecurity.contract.test.js` verifying the 10-minute TTL, both matching user-facing strings, and absence of the stale five-minute copy.
- Change is committed to the PR branch. Automated test execution is pending; do not mark this test passed until CI runs successfully.


## Supabase auth/profile trigger verification — 2026-11-16

- Read-only inspection of the connected Supabase project's `auth.users` triggers confirms `on_auth_user_created` invokes `public.handle_new_user()` after every auth-user insert.
- The current database function reads `name`, `full_name`, or `display_name` from auth user metadata, falls back to `ZannyChat User`, derives a valid username base, appends the first eight hexadecimal characters of the auth UUID, and inserts the profile row. On profile-ID conflict it fills a blank/legacy name and fills a blank username without overwriting a non-empty existing username.
- This trigger is the server-side username bootstrap path for both email and Google OAuth signups; the frontend Google OAuth flow correctly relies on the auth-state listener rather than creating a second profile row.
- This confirms the auto-username mechanism exists in the live database; it does not prove every historical user already has a username or that all OAuth metadata variants supply a display name. The function's explicit fallbacks cover absent name metadata.
- No Supabase migration or data change was needed. Do not query or expose real users' personal profile data for this check.


## Latest source checkpoint — 2026-11-16

- Verified the screen inventory table contains exactly 46 screen rows and no remaining `Pending source review` / `Source review pending` entries. This is first-pass source coverage only, not completed visual or runtime acceptance.
- Confirmed PR #85 remains open, draft, unmerged and mergeable according to the latest PR metadata snapshot. Its branch remains `design/crown-aurora-premium-system`.
- Final composer cleanup removed an unused theme-token destructure and redundant inline border-width override. Latest code commit: `8414425a7a19259428ee8440293268b774c38c31`.
- Latest queried commit has no associated GitHub Actions run returned by the current workflow query; Vercel remains blocked by the team's build-rate limit. Do not claim the new composer/privacy tests have run.
- Supabase read-only inspection confirmed the auth-user insert trigger creates a profile and generates a username from available name metadata with a safe fallback and UUID suffix. No live account PII was read and no DB changes were made.
- The PR description has been refreshed to include the composer and privacy fixes, the complete first-pass screen source review, and the outstanding QA/deployment gates.


## Supabase database security/performance advisor review — 2026-11-16

### Verified
- Supabase security advisor reports every exposed `public` table has RLS enabled; a read-only catalog query found no public table with RLS disabled.
- The advisor reports 37 RLS-enabled tables with no policies. These are not automatically defects: sampled call-history, scheduled-message, channel and LIVE flows use authenticated backend routes and a server-side service client, while their underlying tables are intentionally backend-only. Do not add broad authenticated policies just to silence this informational lint.
- The advisor reports 28 SECURITY DEFINER functions callable by authenticated users. Sampled functions were reviewed: user-facing RPCs bind identity to `auth.uid()` (including profile visibility, status audience, poll/event operations, message deletion, directory lookup and read-state); visible-avatar/cover helpers delegate to profile visibility checks; legacy poll overloads delegate to guarded current signatures. Internal worker/trigger functions are not executable by authenticated users. Keep the warnings as a review inventory, not a blanket instruction to revoke execution.
- RLS policy inspection confirms conversation membership gates, own-profile update, visible-message selection, message sender update, status audience checks, poll membership/voting checks, event membership, and own push-token management. Some sensitive tables are backend-only and have no client policies.
- The broad-looking profile SELECT policy branch that checks for a status row is still constrained by the separate `status_updates` SELECT RLS policy, which requires an unexpired status and `can_view_status` audience authorization. No bypass was established from that branch.
- Performance advisor reports 65 unused indexes. Many are newly introduced FK/support indexes or low-traffic worker indexes; index statistics alone do not justify dropping them. Health advisor returned no findings.

### Backend route cross-checks
- `/calls/history`, `/conversations/scheduled-messages`, `/channels`, and `/live` routers apply `requireAuth`; their handlers scope mutations to the authenticated actor and use the backend service client for backend-only tables.
- Events and polls use RLS-backed table reads and SECURITY DEFINER RPCs for write paths; the relevant RPC definitions enforce authenticated identity and conversation membership.

### Outstanding security work
- Full function-by-function and route-by-route security review is still required before declaring a complete security audit; this pass sampled representative high-risk paths and the advisor inventory.
- Review the message and call-session UPDATE policies for mutable-column scope and transition invariants against their trigger guards and backend flows. Do not widen grants or change policies until the exact supported client write paths and regression tests are mapped.
- Review Storage bucket policies and public/private object URL handling separately; table RLS does not secure Storage objects.
- No database migration or data mutation was made during this advisor pass.

### Product completeness note
- Settings explicitly marks the Zero-Knowledge Vault as “COMING SOON” and says it is not built yet. This is an acknowledged unimplemented feature, not a broken switch. Do not market or represent it as shipped until end-to-end encryption-at-rest/key management, recovery, threat model and cross-device flows exist.
