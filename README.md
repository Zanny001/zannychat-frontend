# ZannyChat — Frontend

The mobile frontend for **ZannyChat**, built with React Native + Expo.
It runs on mock data out of the box (`src/services/mockData.js`), so you
can click through the entire app — sign up, chat list, conversations,
swipe-to-reply, reactions, mood switching, wallet — with no backend at
all. Every screen calls through `src/services/api.js`, so connecting
the real backend (`zannychat-backend`) later is a config change, not a
rewrite.

## Design system — "Signal & Thread"

The whole visual identity comes from one idea: a conversation is two
voices. Every screen expresses that literally in color rather than
using one accent for everything:

- **Signal** (warm) is always *your* voice — your message bubbles, the
  primary button, the active tab.
- **Thread** (cool) is always *their* voice — the accent rail on
  received bubbles, secondary icons.
- **Gold** belongs to money alone. It never appears outside the Wallet
  tab, so a screen with gold on it always means "this is about your
  balance."

Four moods (Ember, Tide, Aurora, Dawn — Settings → Appearance) each
define their own signal/thread/gold trio, so switching moods actually
changes the palette relationships, not just one accent color. The mood
picker itself shows this: each swatch is two overlapping circles, not
one flat color (`src/components/MoodSwatch.js`).

Two typefaces carry the rest of the personality: **Space Grotesk** for
anything display-sized or numeric (the wordmark, screen titles, the
wallet balance), **Manrope** for everything meant to be read at length
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
Settings sections, Profile's menu rows, Wallet's roadmap list, the
message input bar, and the bottom tab bar are all glass. The one
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
- **Chat list** with search, unread badges, and an invitation-to-act
  empty state
- **Conversation screen**: signal/thread bubble treatment, swipe-to-reply,
  long-press reactions, typing bar, AI smart-reply chips, and a
  summarize action in the header (both need `ANTHROPIC_API_KEY` set on
  the backend — see `zannychat-backend`'s README)
- **Attachments**: real photo, file, and contact sharing from the chat's
  attach button — photos and files upload to Supabase Storage and show
  as an image thumbnail (tap for fullscreen) or a name+size card (tap to
  open); sharing a contact sends a tappable card that starts a chat with
  them. All need Supabase connected (Storage uploads require a real
  session); mock mode still works using the picked file's local URI
  directly, just without a real upload.
- **New chat / contacts** screen (QR-scan entry point stubbed for later)
  — also doubles as the "share a contact" picker
- **Profile** screen with a real **Edit Profile** screen — name, status,
  and a tap-to-change photo that uploads to Storage
- **Settings → Connections**: live status for Supabase and the backend —
  the backend row actually calls its `/health` route rather than just
  checking a URL is set, so "Live" means the deployed service can reach
  its own database, not just that this app can reach the service
- **Settings → Mood**: four two-tone moods, switch instantly, applies
  app-wide
- **Wallet tab**: gold balance card, live once the backend is connected
  (`GET /wallet/balance`), a styled preview otherwise — no real payment
  processing in this build either way, see `zannychat-backend`'s README

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

**Current status of this specific project:** all three vars in `.env`
are filled in with real values — Supabase project `vithpppgyjmazxvogvno`
(using the newer `sb_publishable_...` key, not a legacy JWT anon key)
and the backend at `https://zannychat-backend.onrender.com`. The "DEMO
DATA" pill on the Chats screen should be gone; if it's still showing,
`.env` wasn't picked up — see the troubleshooting note below.

One thing to verify on your end, since I can't check it: **the backend's
`SUPABASE_URL` on Render needs to point at this exact same project**
(`vithpppgyjmazxvogvno`). If the backend was set up against a
*different* Supabase project, session tokens this app generates won't
validate there, and `POST /conversations` / `GET /wallet/balance` will
fail with 401s even though both services individually report healthy.

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
3. **The Express backend** (new chat creation, wallet balance) — once
   it's deployed on Render:
   ```
   EXPO_PUBLIC_BACKEND_URL=https://your-service.onrender.com
   ```
   `src/services/backendClient.js` picks this up the same way. Note that
   `createConversation` and `fetchWalletBalance` both check *both* flags
   before calling the backend, not just this one — the backend's routes
   require a Supabase session token to authenticate the request, so a
   backend URL with no Supabase session to attach is a dead end by
   design, not a bug. `checkBackendHealth()` (used by Settings →
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
  navigation/                 Stack + bottom tab navigation
  screens/                    One file per screen
  components/
    Knot.js                    The signature mark (static or animated)
    MoodSwatch.js               Two-circle swatch used in Settings
    GlassCard.js                 Blurred, tinted, bordered surface — used everywhere
    GlassInput.js                 Lighter glass treatment for text fields
    Avatar.js, ChatBubble.js, InputBar.js, ChatListItem.js, Header.js
  services/
    supabaseClient.js         Reads env vars, no-ops if unset
    backendClient.js           Same idea, for the Express backend on Render
    api.js                    Single place every screen calls — mock or live
    mockData.js                Demo data used until the backend is connected
  utils/
    motion.js                  Reduced-motion hook, used by Knot
    color.js                    hexToRgba() — tints every glass surface
```

## Testing in Snack specifically

Confirmed from an actual run: the onboarding hero (Knot mark included),
mood picker, glass cards, chat list, and wallet card all render
correctly in Snack's own preview. A few Snack-specific things worth
knowing:

- **`.env` doesn't reliably work in Snack** — confirmed limitation
  (github.com/expo/expo/issues/24180), not specific to this project.
  `supabaseClient.js` and `backendClient.js` both fall back to this
  project's real (non-secret) values when the env var isn't present, so
  Snack should work without any extra config. If Settings → Connections
  still shows "Not configured," the fallback values themselves may need
  updating (e.g. if you rotate the Supabase key).
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

This build covers **Phase 1** (core messaging UI) fully, and the first
slice of **Phase 3** (AI) — smart replies and summaries are real,
calling Claude through the backend. **Phase 2** (fintech) has a working
ledger and wallet endpoints but no real payment provider connected yet.
Phase 4 (enterprise/privacy hardening) and Phase 5 (multi-platform) are
still just the placeholders (vault toggle, roadmap text) they always
were.

## Next step

The backend (Supabase schema + Express API on Render) is built and lives
in `zannychat-backend`. Deploy it, then follow "Connecting the real
backend" above — that's the whole integration.
