# ZannyChat frontend 1.2.86 — group settings state preservation

## Change

Fixed a group-management UI regression where saving the group name, topic, description, and announcement-mode setting could visually turn announcement mode off if the update API response omitted `adminOnlyMessages`. The screen now uses an explicit boolean returned by the server when available, otherwise preserving the selected value already held by the screen. The success message now accurately mentions all saved group settings.

## Validation

- Frontend unit tests: 100 passed, 0 failed.
- Frontend release audit: 12/12 passed.

## Scope and limitations

This is a frontend state-preservation fix. No backend change or database migration is required. Live Supabase behavior, multi-account permissions, hosted deployment, and physical-device behavior have not been verified in this increment.
