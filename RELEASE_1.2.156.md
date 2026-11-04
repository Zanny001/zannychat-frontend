# ZannyChat release 1.2.156

## Focus
Profile metadata normalization and input-boundary hardening.

## Changes
- Normalize optional profile detail text and strip control characters.
- Bound language-list size and item lengths before display.
- Add regression tests for malformed whitespace and oversized arrays.

## Validation
- Frontend unit tests: 280 passed, 0 failed.
- Release audit: 12/12 checks passed.
- Production build/device/live integration: not run in this source-only pass.
