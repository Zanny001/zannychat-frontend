# Receipt Data Validation — 1.2.166

- Hardened delivery receipt helpers against malformed receipt maps and non-array acknowledgement values.
- Only non-empty string recipient IDs are counted, with duplicate recipients counted once.
- Group receipt details now ignore invalid member identifiers and malformed read/delivery state containers.
- Group display names are trimmed, bounded to 100 characters, and fall back safely when blank.
- Added regression tests for malformed receipt maps, non-array delivery values, invalid participant IDs, and display-name limits.

This is client-side defensive handling. Backend authorization, receipt integrity, and production integration still require independent verification.
