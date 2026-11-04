# ZannyChat frontend 1.2.107 — Status viewer pause/resume

## Changes
- Added an accessible pause/resume control for automatic Status progression.
- Pausing cancels the active auto-advance timer; resuming restarts the dwell interval for the currently displayed Status.
- Video playback follows the paused state and resumes when progression is resumed.
- Opening a different Status resets playback to unpaused; closing the viewer stops progression.
- Existing longer dwell durations remain: text 10 seconds, image 15 seconds, video up to 60 seconds.

## Verification
- Unit tests cover the pause/resume UI wiring and ensure the timer is disabled while paused.
- This is a source-level increment. No production deployment, live database changes, physical-device run, or Expo production build is implied.
