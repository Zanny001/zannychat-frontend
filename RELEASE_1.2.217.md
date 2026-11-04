# ZannyChat 1.2.217 — Premium member directory

- Added user-scoped, device-local member favorites with safe normalization, duplicate removal, and a bounded list size.
- Added All members / Online / Favorites directory filters with selected-state accessibility semantics.
- Added one-tap favorite controls with 44-point touch targets and clear empty states.
- Favorites are stored locally per signed-in user; they are not sent to the server or shared across accounts.
- Existing member search, presence subscription, QR connect, group creation, and contact sharing remain available.

## Known limitation / next design phase
This release does not yet match address-book phone numbers to ZannyChat accounts. The current profile schema does not provide a verified, privacy-preserving phone discovery contract. The planned implementation should use explicit opt-in, verified phone numbers, server-side matching, rate limits, discoverability controls, and must never expose phone numbers or upload the entire address book without informed consent.

## Verification
- Frontend utility tests: 393 passed, 0 failed.
- Backend tests: unchanged; backend remains version 1.2.58.
- Release audit and JSX parse check are recorded in the release summary.
- No production deployment or physical-device testing was performed.
