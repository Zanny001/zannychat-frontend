# ZannyChat 1.2.191

- Hardened channel discussion comment merging across paginated pages.
- Applied deterministic chronological ordering and ID-based deduplication.
- Added regression tests for overlapping pages, updated duplicate records, equal timestamps, malformed rows, and absent page arrays.
- No database migration required.
