# ZannyChat 1.2.168

## Focus
Retry-After-aware transient network retries.

## Changes
- Respect valid `Retry-After` response headers for transient failures.
- Support delta-seconds and HTTP-date formats.
- Bound server-provided wait time to 30 seconds.
- Preserve the bounded retry-attempt limit and fallback backoff.
- Add regression tests for header formats, invalid values, clamping, and HTTP 429 retry behavior.

## Validation
- Automated frontend unit tests: run for this release; see accompanying delivery summary.
- Frontend release audit: run for this release; see accompanying delivery summary.
- Production build, backend integration, real-device testing, and deployment are not claimed by this source package.
