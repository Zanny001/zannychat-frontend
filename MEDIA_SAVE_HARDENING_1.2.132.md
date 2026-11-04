# Media save hardening — 1.2.132

- Centralized saving chat and Status images/videos through one helper.
- Accepts only HTTP(S) media URLs and supported image/video kinds; bounds URL length and sanitizes cache filename prefixes.
- Checks download HTTP status before saving to the device library.
- Cleans temporary cache files after success or failure where supported.
- Uses the same permission and error path for chat media and Status media.

## Verification

Run `npm run test:unit` and `npm run audit:release` in the frontend directory. A native device build and gallery permission checks are still required before production deployment.
