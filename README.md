# ZannyChat — Frontend (Phase 1)

This is the mobile frontend for **ZannyChat**, built with React Native + Expo.
It's stage 1 of the plan: get a working, demoable UI first, then build the
backend to match it, then wire the two together.

Right now the app runs entirely on **mock data** (`src/services/mockData.js`),
so you can open it and click through the whole thing — sign up, chat list,
conversations, swipe-to-reply, reactions, theme switching — without any
backend at all. Every screen already calls through `src/services/api.js`,
so connecting the real Supabase backend later is a config change, not a
rewrite.

## What's in this build

- **Onboarding → Sign up / Sign in** (Supabase Auth-ready, works offline as a demo)
- **Chat list** with search and unread badges
- **Conversation screen**: message bubbles, swipe-to-reply, long-press
  reactions, typing bar
- **New chat / contacts** screen (with a QR-scan entry point stubbed for later)
- **Profile** screen
- **Settings → Dynamic Theme Engine**: four palettes (Nexus, Midnight, Sunset,
  Ocean), switch instantly, applies app-wide
- **Wallet tab**: styled preview of the Phase 2 fintech layer — intentionally
  no real balances or payment logic yet, just the UI shell to build against

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
  react-native-gesture-handler react-native-reanimated react-native-url-polyfill \
  @supabase/supabase-js @react-native-async-storage/async-storage

npx expo start
```

Scan the QR code with **Expo Go** on your phone, or press `i` / `a` for a
simulator.

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
`App.js` and `src/` into a new project at [snack.expo.dev](https://snack.expo.dev) —
that's the fastest loop for tweaking the theme engine or a screen's layout
and sharing a live link with others to react to.

## Connecting the real backend later

1. Copy `.env.example` to `.env`.
2. Once the backend project's Supabase URL and anon key exist, drop them
   into `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Restart `expo start`. `src/services/supabaseClient.js` detects the env
   vars automatically and every screen switches from mock data to live
   data — no other code changes needed.

## Project structure

```
App.js                     Entry point (theme + navigation providers)
src/
  theme/                   Dynamic Theme Engine (palettes, spacing, type scale)
  navigation/               Stack + bottom tab navigation
  screens/                  One file per screen
  components/               Avatar, ChatBubble, InputBar, ChatListItem, Header
  services/
    supabaseClient.js       Reads env vars, no-ops if unset
    api.js                  Single place every screen calls — mock or live
    mockData.js              Demo data used until the backend is connected
```

## Roadmap this maps to

This build covers **Phase 1** of the plan (core messaging UI). The
**Wallet** tab and reaction/vault touches are placeholders that Phase 2
(fintech) and Phase 4 (privacy hardening) will fill in on the backend
side — the frontend hooks are already there waiting for them.

## Next step

The backend (Supabase schema + Express API on Render) is being built next
as a separate delivery. Once it's ready, connecting it here is just the
three steps above.
