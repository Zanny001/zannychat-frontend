# Custom chat folders — 1.2.39

This release extends the local custom-folder feature introduced in 1.2.38.

- Create custom folders with inclusion and exclusion rules.
- Edit an existing folder without losing its creation timestamp.
- Reject duplicate names (case-insensitive) through the storage service.
- Delete a folder without deleting conversations or messages.
- Restore the chat-list filter to All if the currently selected custom folder is removed.
- Folder data remains per-account on the current device; it is not server-synced.

Verification: frontend unit tests and release-hygiene audit run locally. This is not a production deployment or device-build certification.
