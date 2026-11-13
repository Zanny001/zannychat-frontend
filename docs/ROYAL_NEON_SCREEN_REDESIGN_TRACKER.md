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

- [ ] Updates
- [ ] StatusUpdates
- [ ] Channels
- [ ] Polls
- [ ] Events

### Profiles, groups and discovery

- [ ] Profile
- [ ] PeerProfile
- [ ] EditProfile
- [ ] CreateGroup
- [ ] GroupManagement
- [ ] JoinGroup
- [ ] QRContact
- [ ] ContactDiscovery

### Account, settings and support

- [~] Settings — theme presets and custom colour studio
- [ ] PrivacySecurity
- [ ] Notifications
- [ ] DataStorage
- [ ] DataExport
- [ ] Sessions
- [ ] Help

### Authentication

- [ ] Onboarding
- [ ] Login
- [ ] Signup
- [ ] VerifyEmail
- [ ] PasswordRecovery
- [ ] PasswordReset

### Additional route

- [ ] ScheduledMessages

## Completion gates

1. Preserve all existing route names, data contracts, permissions and message/call behavior.
2. Every screen must support the shared dynamic palette and both light and dark appearance.
3. Keep text contrast, focus states, screen-reader labels and touch targets accessible.
4. Respect reduced motion; no continuous high-cost visual effects.
5. Test web export and native Android behavior; do not treat a web preview as proof of native calling/camera support.
6. No production deploy, database migration or PR merge without its own validation and approval.
