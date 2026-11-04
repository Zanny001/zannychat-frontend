# Retry-After Parsing Hardening — 1.2.169

## Changes
- Accept string and array-style response headers while selecting one explicit header value.
- Trim header whitespace and accept RFC-style non-negative integer delta-seconds or HTTP-date values.
- Respect an explicit zero maximum delay while retaining the global 30-second upper bound.
- Reject malformed numeric syntax and invalid injected clock values instead of silently treating them as valid delays.
- Restrict HTTP status-based transient classification to valid 5xx statuses (500–599), plus 408, 425 and 429.

## Validation
- Added regression coverage for array headers, whitespace, zero delay caps, invalid numeric forms, invalid clocks and out-of-range status values.
- Production build and live integration are not claimed by this source release.
