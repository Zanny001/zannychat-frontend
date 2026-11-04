# Profile Presence Privacy — 1.2.142

- Profile presence now respects explicit online-status and last-seen visibility/hide flags when those fields are supplied by the participant data.
- Invalid and future last-seen timestamps are not shown.
- When visibility is explicitly disabled, the profile shows a neutral contact label rather than exposing online/last-seen data.
- Missing privacy metadata preserves the existing display behavior for compatibility; this client-side safeguard does not replace server-side privacy enforcement or establish that the backend returns authoritative privacy settings.

Validation: see the frontend utility test and release audit results for this source package.
