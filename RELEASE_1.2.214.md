# ZannyChat 1.2.214 — Channel Discovery Experience

## Added
- Channel directory filters for All, Following, Popular, and Newest.
- Popular sorting ranks loaded directory entries by subscriber count, preserving original order for ties.
- Newest sorting uses channel creation timestamps, with deterministic stable ordering for missing/invalid dates.
- Following filter and empty states guide users back to channel discovery.
- Accessible filter selection states, clear filter counts, concise contextual descriptions, and premium touch-friendly chip styling.
- Added isolated unit tests for filtering, sorting, malformed data, immutability, and counts.

## Scope and limitations
- Sorting/filtering applies to the directory rows returned by the existing API; this release does not claim global ranking across channels the API has not returned.
- No backend behavior or database schema changed. No migration required.
- Source-only release. Production deployment, native-device verification, and live service smoke tests have not been performed.
