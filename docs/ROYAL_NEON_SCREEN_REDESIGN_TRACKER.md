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
- [ ] Run frontend unit tests and release audits on the latest feature-branch head.
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
- Two GitHub quality workflows were started during this pass but were cancelled before completing their export/test stages; do not treat them as passing. A clean latest-head validation is still required after implementation work settles.

- Contact discovery, LIVE hub badges, missed-call history, chat deletion, message deletion and media-send actions now consume dynamic theme danger/primary foreground tokens.
- Story publishing actions use the contrast-safe primary foreground; full-screen story media remains a dark cinematic stage so image/video content and white overlay controls remain legible.
- ScheduledMessages was verified to use the shared palette provider; interaction and accessibility regression checks remain open.

- Profile, peer profile and edit-profile action foregrounds now use contrast-safe theme tokens.
- Group creation, QR scanner and the authentication primary actions now use the selected palette's readable foreground token.
- Privacy/security destructive actions, session revocation and data export actions now use dynamic danger/primary tokens rather than fixed brand colours.
- Status updates, notifications, storage, export, sessions and help were inspected and already consume the shared theme provider; further interaction/accessibility validation remains open.

- Profile photo viewer close control retains a fixed white foreground on its intentionally black full-screen media stage; dynamic palette foregrounds remain applied to surrounding profile UI.

- GlassCard now skips live backdrop blur on Android API 30 and below while retaining the tinted surface, specular edge and elevation; Android 12+ and iOS keep the blur treatment. Physical Android 10 performance validation remains open.
