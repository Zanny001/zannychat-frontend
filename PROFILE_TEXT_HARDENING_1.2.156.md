# Profile text hardening — 1.2.156

- Normalize profile display strings to Unicode NFC.
- Replace control characters and collapse whitespace to prevent confusing multi-line profile metadata.
- Bound language arrays by item count and per-item length before joining, then enforce the overall display limit.
- Keep website values restricted to HTTP(S) URLs without embedded credentials.
- Add regression tests for control characters, whitespace, and oversized language arrays.

Validation: frontend unit suite and release audit are run for this package. Production build, device verification, and live deployment are not implied by these checks.
