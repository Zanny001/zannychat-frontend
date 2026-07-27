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
(the Chats header) it's a small static mark. It respects the OS-level
"reduce motion" setting (`src/utils/motion.js`) and skips the draw-in
entirely when that's on.

## What's in this build

- **Onboarding** with the animated Knot hero → **Sign up / Sign in**
  (Supabase Auth-ready, works offline as a demo)
- **Chat list** with search, unread badges, and an invitation-to-act
  empty state
- **Conversation screen**: signal/thread bubble treatment, swipe-to-reply,
  long-press reactions, typing bar
- **New chat / contacts** screen (QR-scan entry point stubbed for later)
- **Profile** screen
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
  expo-font expo-splash-screen \
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
   `src/services/backendClient.js` picks this up the same way. With it
   set, tapping a contact in **New chat** creates a real conversation via
   `POST /conversations`, and the **Wallet** tab shows a live balance via
   `GET /wallet/balance` instead of the static preview.
4. Restart `expo start` after editing `.env` — Expo only reads
   `EXPO_PUBLIC_*` vars at startup.

Either var can be set without the other — the app degrades gracefully
either way (checked in `src/services/api.js`).

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
    Avatar.js, ChatBubble.js, InputBar.js, ChatListItem.js, Header.js
  services/
    supabaseClient.js         Reads env vars, no-ops if unset
    backendClient.js           Same idea, for the Express backend on Render
    api.js                    Single place every screen calls — mock or live
    mockData.js                Demo data used until the backend is connected
  utils/
    motion.js                  Reduced-motion hook, used by Knot
```

## Troubleshooting

**Fonts don't load / app stays blank.** `App.js` holds the splash
screen up until Space Grotesk and Manrope finish loading, then renders
nothing (`return null`) in between — that's intentional, not a bug. If
it never resolves, double check `@expo-google-fonts/space-grotesk` and
`@expo-google-fonts/manrope` are actually installed.

**Animations don't run / a Babel warning mentions `react-native-reanimated/plugin`.**
See the Reanimated v4 note above — install `react-native-worklets`.

## Roadmap this maps to

This build covers **Phase 1** of the plan (core messaging UI). The
**Wallet** tab and reaction/vault touches are placeholders that Phase 2
(fintech) and Phase 4 (privacy hardening) will fill in on the backend
side — the frontend hooks are already there waiting for them.

## Next step

The backend (Supabase schema + Express API on Render) is built and lives
in `zannychat-backend`. Deploy it, then follow "Connecting the real
backend" above — that's the whole integration.
