# ZannyChat frontend 1.2.105 — timed Status viewer

- Added automatic Status progression while the viewer is open: text statuses display for 5 seconds, images for 7 seconds, and videos for up to 30 seconds.
- The viewer advances in the currently loaded feed order and closes after the last loaded item.
- Timers are cleaned up when the current item changes or the viewer closes, preventing stale timers from navigating after dismissal.
- Existing manual Previous/Next controls remain available.
- Added unit tests for content-specific dwell times and a source-contract test for timer cleanup and progression.

## Validation

- Frontend unit tests: 148 passed, 0 failed.
- Release audit: 12/12 passed.
- This was a source-only change; no Expo production build, device test, hosting deployment, or database change was performed.

## Limitations

- Progression is based on the loaded feed order, not a separate per-contact story-ring queue.
- Video progression uses a 30-second timer rather than detecting the actual end of playback.
