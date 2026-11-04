# Shared Media Pagination Reliability — 1.2.152

- Protect initial shared-message loading from stale responses when the conversation changes or a retry supersedes an earlier request.
- Validate paginated message response shape before updating UI state.
- Merge older pages in chronological order while deduplicating overlapping IDs and ignoring malformed rows.
- Keep stale pagination failures from overwriting the current screen state.

Validation: run `npm run test:unit` and `npm run audit:release`.
