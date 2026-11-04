# Channel comment merge reliability — 1.2.191

## Change
Introduced a shared comment-page merge helper used when loading older comments and when adding a newly published comment to the local list.

## Behaviour
- Deduplicates rows by non-empty comment ID.
- Keeps the incoming version of a duplicate row, so refreshed content is not discarded.
- Sorts by creation time and then ID to produce deterministic chronological order.
- Ignores malformed rows and tolerates missing page arrays.

## Verification
Run `npm run test:unit` from the frontend directory. This is a client-side source change; no database migration is required.
