# Password recovery callback hardening — release 1.2.10

The recovery handler now accepts both Supabase callback forms: a PKCE `code` exchanged on-device with `exchangeCodeForSession`, or an implicit-flow access/refresh token pair restored with `setSession`. The parser only accepts the `zannychat://reset-password` callback route, and token-based recovery requires `type=recovery`. This avoids silently failing when the configured Supabase auth flow returns a code instead of tokens and rejects unrelated callback URLs.

Unit tests cover both callback formats, invalid routes, missing tokens, and non-recovery token types. A live email flow still needs an allowlisted redirect, configured mail delivery, and an authenticated test project/device.
