# ZannyChat — Frontend

The mobile frontend for **ZannyChat**, built with React Native + Expo.
It runs on mock data out of the box (`src/services/mockData.js`), so you
can click through the entire app — sign up, chat list, conversations,
swipe-to-reply, reactions, mood switching — with no backend at all.
Every screen calls through `src/services/api.js`, so connecting the
real backend (`zannychat-backend`) later is a config change, not a
rewrite.

> **No wallet.** ZannyChat briefly shipped an in-chat wallet/ledger
> preview; it's been removed so this project can stay focused on being
> a chat app — payments now live in a separate, dedicated product. If
> you're updating an existing deployment, see `zannychat-backend`'s
> README for the migration that drops the leftover database tables.

## Design system — "Signal & Thread"

The whole visual identity comes from one idea: a conversation is two
voices. Every screen expresses that literally in color rather than
using one accent for everything:

- **Signal** (warm) is always *your* voice — your message bubbles, the
  primary button, the active tab.
- **Thread** (cool) is always *their* voice — the accent rail on
  received bubbles, secondary icons.
- **Gold** is the standalone accent — the favorite star on a chat, the
  "DEMO DATA" pill when no backend is connected, a pending status dot
  in Settings. It's deliberately rare, so it still reads as a flag
  worth noticing rather than a third default color.

Four moods (Ember, Tide, Aurora, Dawn — Settings → Appearance) each
define their own signal/thread/gold trio, so switching moods actually
changes the palette relationships, not just one accent color. The mood
picker itself shows this: each swatch is two overlapping circles, not
one flat color (`src/components/MoodSwatch.js`).

Two typefaces carry the rest of the personality: **Space Grotesk** for
anything display-sized or numeric (the wordmark, screen titles, unread
badges), **Manrope** for everything meant to be read at length
(messages, body copy, buttons) — see `src/theme/typography.js`.

The signature mark is **Knot** (`src/components/Knot.js`) — two open
rings in the signal/thread colors, drawn with `react-native-svg`. On
Onboarding it draws itself in with Reanimated, one ring then the other,
as the one deliberate animated moment in the app; everywhere else
(headers, auth screens) it's a small static mark. It respects the OS-level
"reduce motion" setting (`src/utils/motion.js`) and skips the draw-in
entirely when that's on.

**Glass layer.** Every card, row, input, and header is
`src/components/GlassCard.js` (or its lighter sibling `GlassInput.js`)
rather than a flat colored `View` — a real blur (`expo-blur`) of
whatever's behind, tinted toward the active mood's surface color, with
a hairline light border. It's used consistently: chat previews,
Settings sections, Profile's menu rows, the message input bar, and the
bottom tab bar are all glass. The one
exception is deliberate — chat bubbles stay solid/flat, because message
text needs to win every legibility fight, not share the screen with a
blurred background.

Chat previews also carry a small globe + lock indicator
(`ChatListItem.js`) — a quiet, recurring reminder that a thread is
encrypted and reachable anywhere, without it being a whole banner.

## Media, profile edits, and a data-shape bug worth knowing about

Photos, files, and shared contacts all go through Supabase Storage
(`avatars` and `chat-media` buckets — created by
`zannychat-backend/supabase/migrations/0002_media_and_profile.sql`,
**a separate migration from 0001 — run it too**, or every attachment
call fails with a missing-column error same as the "table not found"
issue from earlier).

While wiring this up, `src/services/api.js` got a real fix: Supabase
returns raw columns (`sender_id`, `avatar_url`, `created_at` as an ISO
string), but every screen was built against mock data's camelCase shape
(`senderId`, `avatarUrl`, a pre-formatted time string) — because mock
data *is* written in that shape by hand. That mismatch was invisible
until Supabase was actually live, since mock mode never exercised it.
`api.js` now normalizes every Supabase read into the shape screens
already expect (`normalizeProfile`, `normalizeMessage`,
`normalizeConversation`) — screens didn't change, because the whole
point of this file is that they shouldn't need to.

Two smaller things fixed in the same pass:
- **Reply previews** now survive a reload — previously only the
  in-memory optimistic echo had the quoted text; a message loaded from
  the database only had a `replyToId` with nothing resolving it to text.
- **Your own profile no longer appears in your own contact list** — it
  did before, and tapping it failed anyway (the backend explicitly
  rejects starting a conversation with yourself).

## What's in this build

- **Onboarding** with the animated Knot hero → **Sign up / Sign in**
  (Supabase Auth-ready, works offline as a demo)
- **Chat list** with search, an invitation-to-act empty state, and
  **All / Unread / Favorites / Groups filter pills** — the same
  category set WhatsApp itself uses (confirmed against real
  screenshots). Long-press a chat to favorite it. Unread badges are
  real counts now, not a placeholder — see the honesty note below.
- **Conversation screen**: signal/thread bubble treatment, swipe-to-reply,
  long-press reactions, typing bar, AI smart-reply chips, and a
  summarize action in the header (both need `ANTHROPIC_API_KEY` set on
  the backend — see `zannychat-backend`'s README). In a group, each
  received message is labeled with the sender's name. **Real read
  receipts** in 1:1s — a message's tick is grey-single while still an
  optimistic local echo, grey-double once actually confirmed by the
  server, and signal-colored double the moment they've actually read
  it (live, via Realtime — not just after a refresh). A plain-text
  message with a URL in it shows a real link preview card underneath
  (title/description/image, fetched server-side from the page's Open
  Graph tags) — needs the backend connected; fails silently to plain
  text otherwise, never a broken card.
- **Group chats** — New chat → New group: pick 2+ people and a name.
  Anyone in the group can post; there's no admin/kick/promote layer,
  a deliberate scope limit, not an oversight. Group read receipts
  aren't attempted either (see the backend README for why).
- **Attachments**: real photo, file, voice note, and contact sharing
  from the chat's attach button (mic icon doubles as the attach
  trigger's neighbor — tap it directly to record). Photos, files, and
  voice notes upload to Supabase Storage; a voice bubble shows an
  inline play button with a real progress bar, not just a duration
  label. Sharing a contact sends a tappable card that starts a chat
  with them. All need Supabase connected (Storage uploads require a
  real session); mock mode still works using the picked file's local
  URI directly, just without a real upload.
- **Push notifications** — real, not stubbed, but needs infrastructure
  beyond what everything else in this app has needed. **Read the
  section below before expecting to see one fire.**
- **New chat / contacts** screen (QR-scan entry point stubbed for later)
  — also doubles as the "share a contact" picker and the group-member
  picker
- **Profile** screen with a real **Edit Profile** screen — name, status,
  and a tap-to-change photo that uploads to Storage
- **Settings → Connections**: live status for Supabase and the backend —
  the backend row actually calls its `/health` route rather than just
  checking a URL is set, so "Live" means the deployed service can reach
  its own database, not just that this app can reach the service
- **Settings → Mood**: four two-tone moods, switch instantly, applies
  app-wide, and persists between launches

## What's new in 1.1 — the post-audit upgrade

A full independent audit (Oct 2026) graded the app and sequenced a
roadmap; 1.1 implements its P0 tier completely and most of P1:

**Safety & abuse resistance**
- **Block & report** — block from any chat's ⋮ menu (they can no longer
  message you — enforced by RLS, not just hidden), report a person or a
  specific message, and manage your block list in the new **Privacy &
  security** screen.
- **Mute & archive** — per conversation, from the chat-list long-press
  sheet or the in-chat ⋮ menu. Muting also stops push notifications from
  that conversation, enforced server-side. Archived chats get their own
  filter pill.
- The backend is now **rate-limited** per user (see its README).

**Finish — nothing that looks shipped but isn't**
- The three dead Profile menu rows now open real screens (**Privacy &
  security**, **Notifications**, **Help**).
- The chat header's **call button is gone** — it had no handler at all;
  voice calls are a roadmap item, not a broken button.
- The "Zero-Knowledge Vault" fake switch is now an honest, disabled
  "coming soon" row.
- The **chosen mood persists** between launches (AsyncStorage) — it used
  to reset to Ember on every restart.
- **App icon, splash screen, and iOS/Android permission strings** are
  configured (the Knot mark, generated for this build).

**Features that used to be half-built, now whole**
- **Reactions persist and sync** — long-press → react now writes to the
  database and appears live on the other person's screen (Realtime),
  instead of silently doing nothing for anyone but you.
- **Real presence** — online dots come from Supabase Presence (who has
  the app open right now), not the mock `profiles.online` column.
- **Typing indicators** — "typing…" in the chat header, via Realtime
  broadcast.
- **Message edit & delete** — long-press your own message; delete is a
  soft-delete tombstone ("This message was deleted"), edits show an
  "edited" label.
- **Camera capture** in the attach sheet, next to the photo library.

**Design system & access**
- The attach menu, reaction picker, and long-press actions are now
  **branded glass bottom sheets** (`ActionSheet`) — the native
  `Alert.alert` lists were the one visible break in the design system.
- **Accessibility labels and roles** on every icon-only control the
  audit listed: attach, mic/send, back, summarize, lightbox close,
  connections refresh, avatars, and more.
- **Date separators** in the message list, and **paginated history** —
  opening a chat loads 30 messages at a time ("Load earlier messages"
  pill up top) instead of the entire history on every open.

**Found while upgrading (not in the audit):** the chat screen compared
`senderId` against the mock-mode literal `'me'`, so in live mode every
message — including your own — rendered as "theirs". 1.1 resolves the
real signed-in user id and compares against that.

## An honesty fix worth flagging

Onboarding used to say "Encrypted the moment you hit send" — not true.
Messages are protected by real access control (Row Level Security: only
conversation participants can read a thread via the app, enforced by
Postgres, not just by the app choosing not to show it to anyone else),
but that's not the same claim as end-to-end encryption, which would
mean not even this project's own database admin could read them. That
second thing isn't built. The copy now says "Private — only you and
them can open it," which is actually true. Real E2E encryption (Signal
Protocol–style key exchange, per-device keys) is a legitimately large
undertaking, not something to half-build and call finished — if you
want it, that's a real feature request, not a quick copy fix.

## Push notifications — needs a development build, not Expo Go

This is different from everything else in this app, worth reading
before assuming it's broken when nothing happens.

**Remote push notifications don't work in Expo Go on Android (SDK 53+),
and don't work at all in Snack's preview** (Web or otherwise) — this is
a platform limitation, not a bug in this code. To actually see a
notification fire, you need a **development build**:

```bash
npm install -g eas-cli
eas login
eas init          # links this project to an EAS project — required,
                   # generates the projectId push registration needs
eas build --profile development --platform android
```

Install the resulting build on a physical device (not a simulator —
push tokens require real hardware) and run `expo start --dev-client`
against it instead of Expo Go.

Without an EAS project linked, `registerForPushNotifications()` in
`src/services/notifications.js` logs why it's skipping and returns
`null` — it never throws, so the rest of the app keeps working exactly
as before. Everything downstream (the `push_tokens` table, the Postgres
trigger, the backend's send logic) is real and wired; this is the one
piece that's on you to set up, because it requires infrastructure
(an EAS account, a real device) I have no way to provide.

## Quick start (recommended — safest path)

Hand-written Expo `package.json` files drift out of date fast, so the
most reliable way to get this running is to let Expo's CLI generate a
fresh project with correct, mutually-compatible versions, then drop
these source files in:

```bash
npx create-expo-app@latest zannychat --template blank
cd zannychat

# remove the generated placeholders we're replacing
rm App.js app.json

# copy everything from this folder into the new project
cp -r /path/to/zannychat-frontend/* .
cp -r /path/to/zannychat-frontend/.env.example .

# install the extra packages this app needs, at versions
# Expo confirms are compatible with your SDK
npx expo install \
  @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs \
  react-native-screens react-native-safe-area-context \
  react-native-gesture-handler react-native-reanimated react-native-worklets \
  react-native-svg react-native-url-polyfill \
  expo-font expo-splash-screen expo-blur \
  expo-image-picker expo-document-picker \
  expo-notifications expo-device expo-audio expo-constants \
  @expo-google-fonts/space-grotesk @expo-google-fonts/manrope \
  @supabase/supabase-js @react-native-async-storage/async-storage

npx expo start
```

Scan the QR code with **Expo Go** on your phone, or press `i` / `a` for a
simulator.

> **Reanimated v4 note:** its Babel plugin now lives in a separate
> `react-native-worklets` package. `babel.config.js` in this project
> already points at `react-native-worklets/plugin` — just make sure
> `react-native-worklets` is actually installed (the command above
> includes it). If you see a warning about `react-native-reanimated/plugin`
> being moved, that's what it's referring to.

### Alternative: straight `npm install`

The included `package.json` will also work with a plain install, but since
its versions aren't pinned to a specific SDK, run the fix-up command
right after:

```bash
npm install
npx expo install --fix
npx expo start
```

### Even faster: snack.expo.dev

For quick UI iteration without a local setup at all, paste the contents of
`App.js` and `src/` into a new project at [snack.expo.dev](https://snack.expo.dev).
Add the Google Fonts packages from the dependency list above in the
Snack's own package panel, or the app will fall back to showing nothing
until fonts load (see "Fonts don't load" below).

## Connecting the real backend

**Default development mode:** no hosted Supabase project or Express backend
is configured automatically. With the `.env.example` values left empty,
the app uses local mock data and does not contact a hosted project. This is
the recommended mode for design work and frontend development.

When you are ready to test integrations, set the variables below to a
dedicated development/staging project. Keep its Supabase URL consistent
with the backend's `SUPABASE_URL`. Do not point local design work at
production unless you deliberately intend to test against production.

Also worth a specific test rather than assuming it's fine: **send a
message between two real accounts and confirm it arrives live**, not
just on refresh. Supabase's newer publishable keys are solid for
everything else, but Realtime specifically has had rough edges
elsewhere in the ecosystem with the new key format — nothing points at
a problem here, it's just the one thing I'd actually verify first
rather than take on faith.

There are two pieces, each toggled by its own env vars — see
`zannychat-backend`'s README for how to stand them up.

1. Copy `.env.example` to `.env`.
2. **Supabase** (chat, auth, profiles) — from the Supabase project's
   Settings → API:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
   `src/services/supabaseClient.js` detects these automatically and every
   chat screen switches from mock data to live data — no code changes.
3. **The Express backend** (new chat / group creation, AI features, link
   previews) — once it's deployed on Render:
   ```
   EXPO_PUBLIC_BACKEND_URL=https://your-service.onrender.com
   ```
   `src/services/backendClient.js` picks this up the same way. Note that
   `createConversation` and the other backend-routed calls all check
   *both* flags before calling the backend, not just this one — the
   backend's routes require a Supabase session token to authenticate
   the request, so a backend URL with no Supabase session to attach is
   a dead end by design, not a bug. `checkBackendHealth()` (used by Settings →
   Connections) is the one exception — `/health` needs no auth, so it
   works as soon as the URL is set, which makes it the fastest way to
   confirm a fresh deploy is actually reachable.
4. Restart `expo start` after editing `.env` — Expo only reads
   `EXPO_PUBLIC_*` vars at startup.

Either var can be set without the other — the app degrades gracefully
either way (checked in `src/services/api.js`).

**Session persistence.** Once Supabase is connected, `App.js` checks
for an existing session before the app renders — a returning signed-in
user lands straight in the chat list instead of seeing Onboarding again
on every launch. This is real, not cosmetic: it's reading the same
session Supabase's SDK persists to `AsyncStorage` after sign-in.

## Project structure

```
App.js                       Entry point — loads fonts, holds the splash
                              screen, then mounts theme + navigation
src/
  theme/
    colors.js                 The mood system (signal/thread/gold per mood)
    typography.js              Space Grotesk / Manrope type scale
    fonts.js                   useFonts() call, loaded once in App.js
    ThemeContext.js             Exposes the active mood + setPalette()
  navigation/                 Stack + bottom tab navigation, exports navigationRef
                               (used by notifications.js to navigate from a tap)
  screens/                    One file per screen, including CreateGroupScreen.js
  components/
    Knot.js                    The signature mark (static or animated)
    MoodSwatch.js               Two-circle swatch used in Settings
    GlassCard.js                 Blurred, tinted, bordered surface — used everywhere
    GlassInput.js                 Lighter glass treatment for text fields
    Avatar.js, ChatBubble.js, InputBar.js, ChatListItem.js, Header.js
    ActionSheet.js               Branded glass bottom sheet (attach, reactions, overflow)
  services/
    supabaseClient.js         Reads env vars, no-ops if unset
    backendClient.js           Same idea, for the Express backend on Render
    notifications.js            Push registration, foreground config, tap-to-navigate
    presence.js                  Real online state via Supabase Presence
    notificationPrefs.js         Persisted banner/sound/push preferences
    api.js                    Single place every screen calls — mock or live
    mockData.js                Demo data used until the backend is connected
  utils/
    motion.js                  Reduced-motion hook, used by Knot
    color.js                    hexToRgba() — tints every glass surface
```

## Testing in Snack specifically

Confirmed from an actual run: the onboarding hero (Knot mark included),
mood picker, glass cards, and chat list all render correctly in
Snack's own preview. A few Snack-specific things worth knowing:

- **`.env` doesn't reliably work in Snack** — Expo Snack may not expose
  environment variables the same way as a local Expo CLI build. This app
  no longer has automatic hosted-service fallbacks: without explicit
  development credentials, it stays in mock-data mode. For live integration
  testing in Snack, configure a dedicated development project deliberately.
- **Snack may auto-add a bad `package.json` entry** like
  `"react-native-url-polyfill/auto": "*"` — that's Snack's dependency
  auto-scanner mistaking a subpath import (`import
  'react-native-url-polyfill/auto'`) for a package name. Harmless, but
  safe to delete if you see it; it may come back if Snack rescans.
- **The "Web" preview tab is a secondary target, not the real one.**
  This is a native-first app — `expo-blur`, `react-native-svg`, and
  Reanimated/worklets all target iOS/Android, and react-native-web's
  support for them is best-effort. For the representative experience,
  use the **My Device** tab (scan the QR with Expo Go) rather than Web.
  An `IDBObjectStore` transaction error in the Web preview's logs is a
  known AsyncStorage-on-web quirk in sandboxed iframes;
  `supabaseClient.js` already routes web specifically to `localStorage`
  instead to avoid it, but native is still the target that matters.

## Troubleshooting

**"DEMO DATA" pill won't go away even though `.env` has real values.**
Expo only reads `EXPO_PUBLIC_*` vars at bundler startup, not on hot
reload — fully stop and rerun `expo start` (clearing the cache with
`expo start -c` if that alone doesn't do it).

**Fonts don't load / app stays blank.** `App.js` holds the splash
screen up until Space Grotesk and Manrope finish loading, then renders
nothing (`return null`) in between — that's intentional, not a bug. If
it never resolves, double check `@expo-google-fonts/space-grotesk` and
`@expo-google-fonts/manrope` are actually installed.

**Animations don't run / a Babel warning mentions `react-native-reanimated/plugin`.**
See the Reanimated v4 note above — install `react-native-worklets`.

**Glass surfaces look flat on Android instead of blurred.** Android's
blur renderer is weaker than iOS's — `GlassCard`/`Header`/`InputBar`
already pass `experimentalBlurMethod: 'dimezisBlurView'` on Android to
get a real blur there too, but the tint overlay underneath is what
actually carries the look either way, so it should never look broken,
just less blurred on some Android devices.

## Roadmap this maps to

**Phase 1** (core messaging) is done, now including group chats, voice
notes, real unread counts, and live read receipts — not just 1:1 text.
**Phase 3**'s first slice (AI smart replies and summaries) is real.
Push notifications — arguably more foundational than any single phase,
since nothing else matters if a message only appears when someone
happens to have the app open — are built end to end but need the EAS
setup above to actually fire.

A wallet/ledger preview (an earlier "Phase 2") shipped briefly and has
since been removed — this project is focused on chat; payments now
live in a separate, dedicated product.

Deliberately not built, and not stubbed either — these need a real
decision or a paid third-party account before there's anything useful
to write:
- **Voice/video calling** — needs a WebRTC signaling setup or a paid
  provider (Twilio, Agora, Stream, LiveKit); a real per-minute cost and
  a provider choice, not something to default silently.
- **GIF/sticker keyboard** — needs a Giphy or Tenor API key.
- **Real end-to-end encryption** — see the honesty note above. What
  exists (RLS-based access control) is real and meaningful; it isn't
  the same claim.
- **Phone number / OTP sign-in** — reviewed a separate reference app
  that had this, but its OTP was entirely fake (a client-side random
  number displayed in the UI for you to read back to yourself, no real
  SMS ever sent). Not worth copying a mocked security flow — real phone
  auth needs an SMS provider (Twilio, same category as calling above).

Still just placeholders: Phase 4 (enterprise/privacy hardening — the
Vault toggle) and Phase 5 (multi-platform).

## Next step

The backend (Supabase schema + Express API on Render) is built and lives
in `zannychat-backend`. Deploy it, then follow "Connecting the real
backend" above — that's the whole integration.


## Accessibility polish in 1.2.4

The shared input component provides a stable screen-reader label, auth forms expose autofill metadata and busy states, and profile/onboarding/tab navigation actions have explicit accessible labels. This is a baseline improvement, not a claim of complete WCAG/mobile accessibility compliance; continue testing with VoiceOver and TalkBack. See `FRONTEND_ACCESSIBILITY_POLISH_1.2.4.md` at the release root.


### QR contact discovery

QR contact discovery requires both a configured Supabase project and the ZannyChat backend. The QR payload contains only the public profile UUID in the `zannychat://contact/<uuid>` format; it does not contain credentials or recovery tokens. Camera permission is requested only when the user starts scanning. Install dependencies using the Expo-compatible package versions before building a native binary.


### Forwarding text messages

Long-press a non-deleted text message and choose **Forward** to send its text to another active conversation. Media forwarding is intentionally not exposed yet: private media is bound to its source conversation, so safe forwarding requires a server-side copy/re-authorize flow rather than reusing a private storage URL.

### Channel post reports (1.2.74)

Users can report channel posts for a bounded set of reasons. Channel owners and active moderators can review open reports and mark them reviewed or dismissed. Apply backend migration `0037_channel_post_reports.sql` before using this feature. Local tests pass; hosted integration and device validation remain required.

### Release 1.2.78 — channel directory search
The Channels screen supports searching channel titles and descriptions. Search uses the authenticated backend and preserves private-channel visibility rules. See `CHANNEL_SEARCH_1.2.78.md` in the delivery bundle for implementation and validation notes.

### Release 1.2.81 — group rename and invite history
Group admins can rename a group from Group details and review/revoke active group invites from an invite-history list. Invite history displays expiry, usage and status without exposing invite tokens. See `GROUP_RENAME_1.2.80.md` and `GROUP_INVITE_HISTORY_1.2.81.md` in the delivery bundle. Local unit tests and release audit passed; live hosted/device validation is still pending.

### Release 1.2.82 — group announcement mode
Group admins can enable announcement mode in Group Management. Members can continue reading, but only admins can send while enabled; the restriction is enforced by backend database RLS rather than only by the UI. Apply backend migration `0040_group_announcement_mode.sql` before enabling this setting. Live staging/device validation remains required.

### Release 1.2.83 — group message status details
Group members can open the message action menu on their own confirmed group messages and select **View message status** to see each member's strongest available state: read, delivered, or awaiting a delivery receipt. Read state is inferred from the member's last-read cursor and is not a precise per-message read event. No migration is required; hosted integration and physical-device validation remain outstanding. See `GROUP_RECEIPT_DETAILS_1.2.83.md`.


## Release 1.2.86 — group announcement state preservation

Fixed a group-management UI regression where saving group name/topic/description could reset the announcement-mode switch visually when the API response omitted that boolean. The saved response now preserves the locally selected announcement value unless the server explicitly returns a boolean, and the success message reflects all saved group settings. Added a regression test. Source-only fix; hosted behavior still requires staging verification.
