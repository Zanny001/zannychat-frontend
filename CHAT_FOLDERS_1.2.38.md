# ZannyChat 1.2.38 — Custom Chat Folders

## Added
- Custom folders with a name, inclusion rules (unread, favorites, groups, private chats), and exclusions (muted, read, archived).
- Folder definitions persist locally per user on the current device.
- Custom folder filters appear inline with All, Unread, Favorites, Groups, and Archived in the chat list.
- Folder management is available from Profile → Chat folders.
- Folder rules are implemented as pure functions with unit coverage.

## Limitations
- Folder definitions are device-local and do not sync to another device.
- Inclusion categories use OR semantics: a chat appears when it matches any selected inclusion rule.
- This release does not add backend tables or modify the production Supabase schema.
- This source release has not been deployed to Netlify or verified on physical devices.
