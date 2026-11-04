# ZannyChat frontend v1.2.109 — Status progress indicator

## Changes
- Added a live progress indicator to the Status viewer, tied to the current content type and configured dwell duration.
- Progress resets when opening or changing a Status, tracks elapsed time while playing, and freezes while automatic progression is paused. Resuming begins a fresh interval consistent with existing timer behavior.
- Added safe percentage calculation with bounds and invalid-input handling.

## Verification
- Run `npm run test:unit` and `npm run audit:release` before release.
- This is a source-level increment; no production deployment or live database changes are included.
