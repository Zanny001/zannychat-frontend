# Status expiry refresh on foreground — 1.2.179

Status expiry pruning now runs immediately when the Status screen mounts and again whenever the app returns to the active foreground state, in addition to the existing 15-second interval. This covers mobile operating systems throttling timers while an app is backgrounded, so expired statuses and an expired open viewer are cleared promptly after return. The AppState listener and interval are cleaned up when the screen unmounts.

Validation: covered with a source-level regression test. This does not replace server-side expiry enforcement or a live-device test.
