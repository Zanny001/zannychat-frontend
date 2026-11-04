# ZannyChat 1.2.153 — Shared Media Attachment Safety

## Changes
- Added a shared-media URL validator that accepts only absolute HTTP(S) URLs without embedded credentials.
- Shared media classification now excludes unsafe attachment addresses before rendering or exposing them as openable items.
- Attachment opening validates URLs at the navigation boundary and handles platform open failures with user-facing feedback.
- Broken photo thumbnails now show an accessible fallback; tapping the fallback retries the image load.
- Added regression tests for accepted and rejected media URLs and classification of unsafe attachments.

## Validation
- Run frontend utility tests with `node --experimental-default-type=module --test src/utils/*.test.js`.
- Run the frontend release audit with `python3 scripts/audit_frontend_release.py`.
- Physical-device testing and production deployment are not included in this source package.
