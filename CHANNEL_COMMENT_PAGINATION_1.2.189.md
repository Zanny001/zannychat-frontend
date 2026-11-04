# Channel comment pagination — 1.2.189

The channel-post comments endpoint now returns the newest bounded page (up to 100 comments) in chronological display order, along with `hasMore` and a stable `{ created_at, id }` cursor for retrieving older pages. Cursor requests preserve PostgreSQL timestamp precision and validate both cursor fields. The timestamp-plus-ID boundary prevents comments with identical timestamps from being skipped or repeated.

The existing client remains compatible because `comments` is still an array; the additional pagination fields are additive. UI-level “load older comments” integration remains a follow-up task.

## Verification scope

Source regression tests verify the query bounds, ordering, cursor validation, and response contract. These tests do not replace integration tests against a deployed PostgreSQL/Supabase environment.
