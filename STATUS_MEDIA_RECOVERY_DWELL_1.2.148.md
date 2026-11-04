# ZannyChat 1.2.148 — Status Media Recovery Dwell

## Change

The Status viewer now pauses its automatic progression timer and progress indicator while an image or video is missing, has failed to load, or is being retried. This keeps the current status open long enough for the user to read the recovery message and retry media without the story advancing underneath them.

## Scope

- Applies to image and video statuses only.
- Existing pause/resume, per-media dwell preferences, navigation and retry behavior remain in place.
- When media recovery succeeds, the normal dwell timer resumes.

## Validation

- Added regression coverage for the recovery-gating conditions.
- Run the frontend unit suite and release audit for this package before distribution.
- Physical-device media playback and production integration still require separate validation.
