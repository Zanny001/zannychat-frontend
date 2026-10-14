# Devices & sessions — 1.2.18

Added a premium-styled Devices & Sessions screen linked from Privacy & Security.

- Displays current device model and OS version using Expo device metadata, plus signed-in email and access-token expiry when available.
- Provides explicit local sign-out and global sign-out actions, with confirmation dialogs.
- Uses Supabase Auth `scope: local` and `scope: global` operations respectively.
- Does not invent a list of remote sessions: the app's current client integration cannot enumerate all active devices. The screen explains the limitation and cautions that token validation/expiry affects revocation timing.
- Both actions are disabled in mock mode.

Test global sign-out behavior against a staging Supabase project and multiple devices before production release.
