# ZannyChat 1.2.145 — Status Media Recovery

## Changes
- Added an explicit retry path when a status image fails to load or its media URL is missing.
- Refreshes signed status media URLs through the existing status service and verifies the result is an absolute HTTP(S) URL before using it.
- Shows accessible loading, error, and retry feedback rather than leaving an empty viewer.
- Keeps retry scoped to the currently viewed status so a late refresh cannot replace a different status's media.

## Validation
- Utility tests cover valid HTTP(S) URLs and reject malformed, relative, and non-web schemes.
- UI source regression tests check the accessible media retry path.
- Device testing and production deployment are separate release gates.
