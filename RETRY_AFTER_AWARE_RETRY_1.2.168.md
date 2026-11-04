# Retry-After-aware transient retries — 1.2.168

- Added parsing for `Retry-After` response headers in seconds or HTTP-date format.
- Applies server-provided retry delays for transient errors such as HTTP 429, while clamping waits to 30 seconds.
- Supports both Fetch-style `Headers` and plain header objects, with an injectable clock for deterministic tests.
- Preserves the bounded retry-attempt count and fallback delay behavior when the header is absent or invalid.
- Added regression tests for seconds, HTTP dates, malformed values, clamping, and rate-limit retry behavior.

This is client-side retry scheduling only. It does not replace server-side idempotency, and the app has not been deployed by this source release.
