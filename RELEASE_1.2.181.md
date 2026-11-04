# ZannyChat 1.2.181

## Reliability hardening
- Scheduled-message date formatting now fails safely for invalid Date objects.
- Scheduled-send validation now rejects invalid reference-clock values instead of allowing `NaN` comparisons to bypass the minimum/maximum scheduling window checks.
- Added regression tests for malformed date and clock input.

This is a source package. It does not indicate that production services were deployed or that mobile builds/device tests were completed.
