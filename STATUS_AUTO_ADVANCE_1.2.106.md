# ZannyChat frontend 1.2.106 — longer automatic Status display

- Increased text Status display duration from 5 to 10 seconds.
- Increased image Status display duration from 7 to 15 seconds.
- Increased automatic video Status duration cap from 30 to 60 seconds.
- Kept Previous/Next controls and timer cleanup behavior unchanged.
- Updated duration tests for all supported content types and the missing-status fallback.

## Validation

- Source tests and release audit are run for this package; results are recorded in the delivery notes.
- Source-only update: no Expo production build, physical-device test, hosting deployment, or database change is implied.

## Limitations

- Video progression still uses a 60-second timer cap rather than detecting actual playback completion.
- Automatic progression follows the currently loaded feed order, not a separate per-contact story queue.
