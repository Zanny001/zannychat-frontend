# Personal data export — 1.2.17

Added **Profile → Privacy & security → Export my data**. The premium export screen creates a JSON file for a currently authenticated Supabase user and opens the operating system share sheet only after the user explicitly starts the export.

## Included
- Auth user ID, email, creation time and last sign-in time (where supplied by Supabase Auth).
- Own profile fields used by ZannyChat.
- The signed-in user's conversation memberships and associated conversation metadata.
- Message rows readable under the user's current Supabase RLS permissions, fetched in pages of 500.
- This device's photo-quality and data-saver preferences.

## Deliberate exclusions
- Authentication tokens, session tokens, passwords, and private attachment URLs/storage paths.
- Attachment binary data. Message export retains safe attachment metadata and marks `included: false`.
- Any data not exposed by the current client schema/RLS. This is not a legal certification of complete data portability.

## Safety notes
- Demo mode disables export; it does not package mock/demo messages as real account data.
- The file is written to the app cache and shared only through the platform share sheet at the user's direction. The recipient chosen in the share sheet may receive sensitive chat history.
- This screen does not upload the exported file to ZannyChat servers.
- Real staging tests still need to verify large histories, expired sessions, device share-sheet behavior, and RLS coverage.
