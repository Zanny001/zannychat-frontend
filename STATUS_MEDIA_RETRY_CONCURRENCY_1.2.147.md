# Status media retry concurrency — 1.2.147

- Prevents rapid repeated taps from issuing overlapping signed-media URL refresh requests before React applies the disabled state.
- Applies refreshed media URLs only when the same status is still open.
- Suppresses stale failure alerts if the viewer has moved to another status.
- Adds regression checks for request locking and status-scoped results.

Validation: run `node --experimental-default-type=module --test src/utils/*.test.js` and `python3 scripts/audit_frontend_release.py`. Native playback and device testing remain required.
