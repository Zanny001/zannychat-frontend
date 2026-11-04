# ZannyChat 1.2.218 — Canonical reconciliation release

## Release goal
Reconcile the newer 1.2.217 premium member-directory experience with the private phone-discovery vertical slice from 1.2.214, rather than treating either archive as a complete superset.

## Included
- Premium member directory: search, All/Online/Favorites filters, user-scoped device-local favorites, and presence-aware listing from 1.2.217.
- Find friends entry in New Chat and the private phone discovery screen from 1.2.214.
- Backend 1.2.60 based on backend 1.2.59, including verified-auth-phone enrollment, HMAC-indexed phone lookup, opt-out deletion, authentication, rate limiting, and migration `0057_private_phone_discovery.sql`.
- Phone discovery accepts only explicitly entered/selected E.164 numbers in batches up to 100; the screen clears the input after a successful match and does not persist raw phone lists.

## Security and privacy notes
- Set `PHONE_DISCOVERY_HMAC_SECRET` on the backend to a high-entropy secret of at least 32 bytes. Never reuse the Supabase service-role key.
- Apply migration `0057_private_phone_discovery.sql` before enabling discovery.
- Raw phone numbers are not stored in the discovery table and should never be logged. Matching requests are rate-limited.
- This release does **not** yet import the native address book automatically; users enter selected numbers manually. Native contact import remains a follow-up requiring the Expo Contacts dependency, explicit OS permission UX, on-device normalization, and device testing.

## Validation status
Source merge and static checks are required before calling this release tested. No production deployment or physical-device verification is included. See `RELEASE_VALIDATION_1.2.218.md` for actual checks performed and remaining steps.
