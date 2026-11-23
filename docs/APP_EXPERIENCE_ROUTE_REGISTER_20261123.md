# ZannyChat Application Route and Experience Register — 2026-11-23

**Source of truth:** `src/navigation/AppNavigator.js` on frontend main at audit start.  
**Purpose:** Reconcile route declarations, screen modules and primary navigation without treating them as interchangeable counts.  
**Status:** Source inventory completed; user-journey and runtime acceptance still open.

## Inventory rules

- A **root route** is a name declared by `RootStack.Screen`.
- A **tab destination** is a nested route declared by `MainTabs.Screen`.
- A **screen module** is an imported React Native screen component. One module may be used by multiple routes; platform-specific `.web.js` files are implementation variants, not new experiences.
- Four root route names are declared twice by design: a guest/auth-required placeholder and the authenticated destination. These are route variants, not duplicate user experiences.
- Route presence proves registration only. It does not prove a complete screen, correct authorization, functional actions, responsive design or production acceptance.

## Verified counts

| Inventory | Count | Interpretation |
|---|---:|---|
| Root-stack declarations | 60 | Includes guest placeholders and authenticated route declarations |
| Unique root route names | 56 | Four names have two conditional declarations |
| Repeated route names | 4 | QRContact, JoinGroup, LiveStream, LiveReplay |
| Primary tab destinations | 6 | Chats, Calls, LIVE, Updates, Channels, Profile |
| Imported screen modules | 56 | Some modules are reused by multiple route contexts |
| Screen JavaScript files in `src/screens` | 62 | Includes platform-specific web variants |
| Backend route modules imported by `src/index.js` | 26 | Current backend entry-point inventory |

## Primary navigation contract

| Tab route | Screen component | Product responsibility |
|---|---|---|
| Chats | ChatListScreen | Inbox and conversation entry |
| Calls | CallHistoryRoute | Call history and call entry |
| LIVE | LiveHubRoute | LIVE discovery and creator entry |
| Updates | StatusUpdatesScreen | Stories/status |
| Channels | ChannelsScreen | Explore and channels |
| Profile | ProfileScreen | Own profile and account entry |

Do not rename or reorder these six destinations as part of screen redesign without a separately reviewed product/navigation change.

## Root-stack experience register

### Authentication and access continuity

| Route | Component | Notes |
|---|---|---|
| Onboarding | OnboardingScreen | Guest entry |
| Login | LoginScreen | Authentication |
| Signup | SignupScreen | Account creation |
| VerifyEmail | VerifyEmailScreen | Verification |
| PasswordRecovery | PasswordRecoveryScreen | Recovery request |
| PasswordReset | PasswordResetScreen | Recovery callback |
| AuthRequired placeholder: QRContact | AuthRequiredScreen | Guest deep-link gate |
| AuthRequired placeholder: JoinGroup | AuthRequiredScreen | Guest deep-link gate |
| AuthRequired placeholder: LiveStream | AuthRequiredScreen | Guest deep-link gate |
| AuthRequired placeholder: LiveReplay | AuthRequiredScreen | Guest deep-link gate |

### App shell and messaging

| Route | Component | Notes |
|---|---|---|
| Main | MainTabNavigator | Hosts the six primary tabs |
| Chat | ChatScreen | Conversation timeline |
| NewChat | NewChatScreen | Start a direct conversation |
| ForwardMessage | ForwardMessageScreen | Message forwarding |
| SavedMessages | SavedMessagesScreen | Saved content |
| Drafts | DraftsScreen | Draft management |
| PinnedMessages | PinnedMessagesScreen | Pinned content |
| ChatFolders | ChatFoldersScreen | Inbox organization |
| SharedMedia | SharedMediaScreen | Conversation media |
| ChatAppearance | ChatAppearanceScreen | Per-chat appearance |
| ScheduledMessages | ScheduledMessagesScreen | Scheduled sending |

### Calling

| Route | Component | Notes |
|---|---|---|
| IncomingCall | IncomingCallRoute | Incoming call state |
| OutgoingCall | OutgoingCallRoute | Outgoing call state |
| Call | DirectCallRoute | One-to-one media session |
| GroupCall | GroupCallRoute | Group media session |
| Call History tab | CallHistoryRoute | Tab destination, not a separate root route |

### LIVE viewer, creator and operations

| Route | Component | Notes |
|---|---|---|
| LivePreflight | LivePreflightRoute | Creator preflight |
| LiveStream | LiveStreamRoute | Active LIVE room |
| LiveReplay | LiveReplayRoute | Replay playback |
| LiveCreatorStudio | LiveCreatorStudioRoute | Creator control center |
| LiveCreatorProfile | LiveCreatorProfileRoute | Dedicated creator-facing profile route |
| LiveReplayLibrary | LiveReplayLibraryRoute | Replay management |
| LiveGuestQueue | LiveGuestQueueRoute | Guest admission |
| LiveModeration | LiveModerationRoute | Room moderation |
| LiveReports | LiveReportsRoute | Reports workflow |
| LiveAnalytics | LiveAnalyticsRoute | Creator analytics |
| LivePostStreamSummary | LivePostStreamSummaryRoute | Post-session summary |
| LiveLeaderboard | LiveLeaderboardRoute | LIVE leaderboard |
| LiveSettings | LiveSettingsRoute | LIVE settings |
| LiveEvents | LiveEventsRoute | LIVE events |
| LiveWallet | LiveWalletRoute | Sparks wallet |
| LiveCreatorEarnings | LiveCreatorEarningsRoute | Earnings ledger view |
| LiveCreatorPayout | LiveCreatorPayoutRoute | Payout request and status |

### Social, groups and discovery

| Route | Component | Notes |
|---|---|---|
| StatusUpdates | StatusUpdatesScreen | Status experience; same module as Updates tab |
| Polls | PollsScreen | Poll creation and participation |
| Events | EventsScreen | Conversation events |
| CreateGroup | CreateGroupScreen | Group creation |
| GroupManagement | GroupManagementScreen | Group administration |
| JoinGroup | JoinGroupScreen | Authenticated group join flow |
| Channels | ChannelsScreen | Shared module with Channels tab |
| QRContact | QRContactScreen | Authenticated QR contact route |
| ContactDiscovery | ContactDiscoveryScreen | Privacy-aware contact discovery |

### Profiles, settings and account

| Route | Component | Notes |
|---|---|---|
| PeerProfile | PeerProfileScreen | Other-user profile |
| EditProfile | EditProfileScreen | Own-profile editing |
| Settings | SettingsScreen | Settings index |
| PrivacySecurity | PrivacySecurityScreen | Privacy and security |
| Notifications | NotificationsScreen | Notification preferences |
| DataStorage | DataStorageScreen | Storage management |
| DataExport | DataExportScreen | Data export |
| Sessions | SessionsScreen | Active sessions |
| Help | HelpScreen | Help and support |

### Main tab route components

The six tab destinations are nested under MainTabs and are not additional root-stack declarations. Their components are ChatListScreen, CallHistoryRoute, LiveHubRoute, StatusUpdatesScreen, ChannelsScreen and ProfileScreen.

## Duplicate route-name handling

The four repeated root route names are conditional:

| Route name | Guest route component | Authenticated route component |
|---|---|---|
| QRContact | AuthRequiredScreen | QRContactScreen |
| JoinGroup | AuthRequiredScreen | JoinGroupScreen |
| LiveStream | AuthRequiredScreen | LiveStreamRoute |
| LiveReplay | AuthRequiredScreen | LiveReplayRoute |

This design protects deep links while requiring authentication. Regression tests must verify that each deep link retains its intended parameters through sign-in and opens the authenticated destination exactly once. Do not remove the guest placeholders simply to make route-name counts unique.

## Required next reconciliation

For every row above, add and verify:
1. Journey purpose and primary user outcome.
2. All entry points (tab, in-app navigation, push notification, universal/app link).
3. Auth, role, ownership, membership, privacy and blocked-user requirements.
4. Data/service owner and read/write endpoints.
5. Loading, empty, offline, permission-denied, retry and terminal-error states.
6. Accessibility, responsive behavior, safe-area and keyboard expectations.
7. Unit/contract/integration/E2E coverage and real-device acceptance evidence.
8. Current implementation status: Accepted, Implemented, Merged, In review, In progress, Not started, Blocked or Needs revalidation.

**Completion rule:** Do not mark a screen Accepted because its route exists, a screenshot looks polished, a static contract passes, a PR merges or a deployment becomes READY. Acceptance requires its full user journey and service path to pass on supported platforms.
