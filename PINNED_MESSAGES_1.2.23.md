# Pinned Messages — 1.2.23

## What it does
- Adds a Pin message / Unpin message action to the existing message action sheet.
- Adds a conversation-scoped Pinned messages screen with search, remove confirmation, and loading/error/empty states.
- Stores a bounded local collection per account using AsyncStorage.
- Rejects deleted messages and malformed message identities.
- Stores only a bounded text preview, sender/conversation labels, timestamp, and attachment type/name. It never stores signed attachment URLs or storage paths.
- Attempts to clear the account's pinned-message collection when account deletion succeeds.

## Important limitations
Pins are private on-device bookmarks. They are not shared with other participants and do not sync across devices. This release does not create a server-side pin, pin banner for all members, or a guaranteed jump-to-message action. Local storage is not an independently encrypted vault. Cleanup after account deletion is best-effort because it runs on the client after server deletion.
