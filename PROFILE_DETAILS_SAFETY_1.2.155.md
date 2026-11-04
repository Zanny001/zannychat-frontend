# Profile Details Safety — 1.2.155

## Changes
- Normalize user-supplied website values to absolute HTTP(S) URLs before display.
- Reject unsafe schemes, malformed URLs, and URLs containing embedded credentials.
- Bound profile-detail string lengths before rendering to reduce oversized or malformed profile fields.
- Preserve the existing rule that profile details are displayed only when explicitly supplied; no values are inferred.

## Validation
- Profile-detail utility tests cover safe URL normalization, rejected schemes/credentials, and string length limits.
- Full production build, backend authorization, and device integration remain separate release gates.
