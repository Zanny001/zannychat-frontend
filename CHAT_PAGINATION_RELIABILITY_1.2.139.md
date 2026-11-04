# Chat pagination reliability — 1.2.139

- Replaced silent older-page failures with a visible, accessible retry action.
- Shows a polite loading status while fetching older conversations.
- Validates server pagination payloads before merging them into the list.
- Deduplicates overlapping pages and ignores malformed rows to reduce duplicate chat entries.
- Keeps the existing cursor-by-offset API contract; this does not introduce server-side cursor pagination.

Validation is performed by the repository's Node utility test suite and frontend release audit. A full native/device test and production deployment remain separate release gates.
