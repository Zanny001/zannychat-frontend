# ZannyChat 1.2.141 — Full-size peer profile photo viewer

## Changes
- Tapping a peer's real profile photo opens an immersive, full-screen image viewer.
- Added an accessible close control and Android back handling through the modal's request-close callback.
- Added image-load failure recovery by closing the viewer instead of leaving a broken full-screen image.
- Validates photo sources as absolute HTTP(S) URLs before using them in the native image component; unavailable photos retain the existing avatar fallback.
- Updated frontend package and Expo app versions to 1.2.141.

## Validation
- Run `node --experimental-default-type=module --test src/utils/*.test.js` for utility tests.
- Run `python3 scripts/audit_frontend_release.py` for the static release audit.
- Native device testing and production deployment are not included in this source-only pass.
