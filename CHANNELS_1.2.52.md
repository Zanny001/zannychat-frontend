# ZannyChat frontend 1.2.52 — Channels

Adds Profile → Channels with public channel creation, discovery, subscribe/unsubscribe, text-only posts, and owner-only deletion. Backend API helpers use the configured authenticated backend; there is no insecure direct-table fallback. Content validation is covered by utility tests.

Requires backend 1.2.6 and Supabase migration `0021_channels.sql`. This is a first public text-channel slice, not a complete Telegram-style channels system. Private channels, media posts, moderators, comments/reactions, notifications, and larger-directory pagination remain future work. No production deployment or real-device test has been performed.
