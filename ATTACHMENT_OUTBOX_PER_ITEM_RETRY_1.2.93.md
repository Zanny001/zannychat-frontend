# ZannyChat frontend v1.2.93 — Per-attachment retry controls

## Changes
- Added a Retry action on each queued attachment so a user can retry one file without re-uploading every eligible queued attachment.
- Individual retry respects the existing exponential backoff policy; the row displays a short remaining wait while the attachment is not eligible.
- Kept the bulk “Retry eligible uploads” action for convenience and retained the existing remove/confirm flow.
- Added a release regression test for individual retry wiring and backoff awareness.

## Limitations
- Retry is still foreground-only and depends on network connectivity and an accessible local or preserved file.
- No background task, server-side retry worker, hosted deployment, or physical-device verification is included.
