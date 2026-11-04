# ZannyChat Frontend 1.2.210

## Status composer draft recovery
- Text-only status drafts now save automatically on-device while the user edits the status.
- Draft recovery restores text, audience mode, expiry preference, and selected audience IDs after the screen/app is reopened.
- Successful publishing clears the local draft.
- Draft normalization rejects malformed payloads, constrains expiry/audience values, deduplicates and bounds audience IDs, and never persists selected media URIs.
- Storage failures and corrupt draft data fail safely without preventing status composition.

## Validation
- Frontend unit tests and release audit run for this release.
- No backend change or database migration is required.
- This source package is not a production deployment.
