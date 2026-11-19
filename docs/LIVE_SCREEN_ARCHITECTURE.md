# ZannyChat LIVE screen architecture

**Status:** canonical navigation consolidation  
**Design system:** Crown Aurora — void navy, violet, cyan, restrained crown gold  
**Scope:** LIVE only. The six primary Main tabs remain unchanged.

## Architecture rule

There is exactly one top-level LIVE entry: the `LIVE` tab in `MainTabNavigator`, rendered by `LiveHubScreen`. Supporting LIVE destinations are registered together in one `RootStack.Group`. The former second `LiveHub` root-stack route was removed because it rendered the same Hub and created two names for one destination. All return paths now target `Main` with `screen: 'LIVE'`.

No new LIVE screen is to be added merely to create another menu item. Add a destination only when it represents a distinct user job, has a clear entry/exit path, and needs its own information hierarchy or lifecycle.

## Screen inventory and responsibility

| Area | Canonical surface | Responsibility | Explicitly not responsible for |
|---|---|---|---|
| Discover | LIVE Hub (`Main/LIVE`) | Browse and search active streams, filters, follows, invitations, replay previews, creator entry points | Creator operations or replay playback |
| Create | Creator Preflight | Permissions, camera preview, device readiness, audience/mode confirmation | Live audience management |
| Broadcast | LIVE Stream | Immersive audio/video room, comments, reactions, stage media, leave/end lifecycle | Historical creator reporting |
| Community identity | LIVE Creator Profile (reuses `PeerProfileScreen`) | Public creator identity, follow state, current LIVE entry | A second bespoke profile implementation |
| Creator workspace | Creator Studio | Current/recent broadcasts, replay status, creator-level quick actions | Time-series analytics |
| Creator insights | Analytics | Verified creator impact and measured aggregate metrics | Invented watch-time, revenue, or trend metrics |
| Event planning | LIVE Events | Schedule, discover, edit, RSVP, invite and cancel upcoming Events | A duplicate generic calendar |
| Archive | Replay Library | Browse owned/authorized recordings and recording states | Playback controls |
| Archive | Replay Player | Secure signed playback, owner-only deletion and expiry messaging | Replay discovery |
| Stage operations | Guest Queue | Review and approve/decline requests; guest capacity | Participant moderation or report adjudication |
| Stage operations | Moderation | Participant roles, mute, spotlight, demotion/removal and moderator assignment | Guest request inbox |
| Trust & safety | Reports | Review, resolve or dismiss submitted LIVE reports | Routine participant controls |
| Community ranking | Leaderboard | Public, privacy-filtered all-time creator impact ranking | Unsupported weekly/monthly rankings |
| Preferences | LIVE Settings | Account-synced defaults for the next LIVE only | Mutating an active room |
| Lifecycle | Post-LIVE Summary | Confirmed end time and replay state, with honest unavailable-metric messaging | A second analytics dashboard |

The LIVE Hub is the only top-level destination. Creator Profile intentionally reuses the existing profile screen rather than duplicating profile UI. Audio Room and Video Chat remain modes of the Broadcast experience, not separate destinations.

## Navigation map

```text
Main tabs
└── LIVE Hub
    ├── Discover stream → LIVE Stream → return to source
    ├── Creator entry → Creator Preflight → LIVE Stream
    │   └── End → Post-LIVE Summary
    │       ├── Replay Library → Replay Player
    │       └── Creator Studio → Analytics
    ├── Creator Profile
    │   └── Watch LIVE → LIVE Stream → return to profile
    ├── LIVE Events
    │   ├── Schedule / edit / RSVP / invite
    │   └── Start Event → Creator Preflight → LIVE Stream
    ├── Leaderboard → Creator Profile
    ├── Replay Library → Replay Player
    └── LIVE Settings
LIVE Stream (creator/moderator-authorized actions)
├── Guest Queue
├── Moderation
└── Reports
```

The navigation hint is never an authorization grant. Creator and moderator controls must continue to derive from the server-issued connection role and permissions. Every destination must re-check the current authenticated account and server authorization.

## Shared service boundaries

- **Discovery and identity:** authenticated LIVE discovery, follow state, visibility and block filtering.
- **Broadcast lifecycle:** stream create/join/heartbeat/leave/end, LiveKit token role and media permissions.
- **Stage operations:** guest requests/invitations, participant listing, mute/spotlight/demotion/removal and moderator assignment.
- **Trust and safety:** comment moderation and report lifecycle.
- **Archive:** Egress lifecycle, private storage, signed playback, ownership, retention and deletion.
- **Creator data:** verified profile/impact aggregates and all-time leaderboard.
- **Events:** authenticated scheduling, audience visibility, RSVP/capacity, private invitations, stream attachment and reminder delivery.
- **Preferences:** account-scoped defaults used only by the next broadcast.

Screens call the existing service/API boundaries; screen components must not write privileged LIVE tables directly or duplicate authorization rules.

## No-duplication and quality gates

1. Keep one canonical Hub route. Do not reintroduce a root-stack alias for the LIVE tab.
2. Keep one broadcast route. Classic Broadcast, Video Chat and Audio Room are modes, not separate screens.
3. Keep one creator identity implementation. Reuse the shared profile surface.
4. Keep list and detail separate only where the task differs: Replay Library vs Replay Player.
5. Keep guest approval, participant moderation and report adjudication as separate operational jobs; do not create additional copies of their controls elsewhere.
6. Contextual in-room controls may be compact shortcuts, but must not become parallel full management workspaces.
7. Creator Studio and Analytics must remain distinct only while Studio focuses on session/replay operations and Analytics on verified aggregates.
8. Use shared Crown Aurora tokens, shared cards/empty/error/loading states, consistent safe-area and touch-target rules, and moderate content widths. Do not create decorative placeholder pages or fabricated data.
9. Every screen needs loading, empty, error/retry, account-switch and unauthorized states appropriate to its data.
10. Production readiness requires source/CI checks plus real two-account browser and two-device native media acceptance. A green build, healthy API or participant row is not proof of delivered audio/video.
11. Replay readiness requires an actual creator-to-viewer Egress, webhook, private object, signed playback, expiry and deletion cycle.
12. Event reminder readiness requires a real scheduled test Event and a verified reminder delivery, not only a successful claim RPC.

## Deferred capabilities

Gift monetization, wallet, payouts, battles/duels, paid boosts and earnings screens remain out of scope until there is a real server-authoritative ledger, payment provider, idempotency, receipts/refunds, fraud controls, legal/KYC readiness and user safeguards. Do not add decorative screens for these capabilities before their services exist.
