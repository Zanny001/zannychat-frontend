# ZannyChat frontend 1.2.104 — Status viewer navigation

- Added Previous/Next controls to move through the currently loaded active-status feed without closing the viewer.
- Navigation follows the feed's existing order and stops at either end; it does not wrap to unrelated statuses.
- Opening a neighboring status uses the existing `openStatus` path, preserving view receipts and owner-reply loading behavior.
- Added unit tests for adjacency, edge behavior, invalid input, and screen controls.
- Source-only increment. Backend and database are unchanged; no deployment or live database change was performed.
- Navigation is limited to statuses already present in the loaded feed. It is not yet the timed, per-contact story-ring player available in mature messaging apps.
