# ZannyChat 1.2.21 — on-device draft recovery

## Implemented
- Message composer drafts persist on-device per signed-in account and conversation.
- Draft keys encode both identifiers to avoid collisions between accounts or conversations.
- Draft text is bounded to 20,000 characters, retains backwards compatibility with drafts stored as plain text, and records a last-updated timestamp; blank drafts are removed rather than stored.
- The composer indicates when a meaningful draft has been saved locally.
- A successful send clears the draft. A failed send leaves the text in the composer so the user can retry.
- Entering message-edit mode does not overwrite an unsent draft; leaving edit mode restores the draft.
- Account deletion attempts to remove that account's local drafts before local sign-out.
- Unit tests cover key isolation, input bounds, and blank-draft handling.

## Privacy and limitations
- Drafts are stored in the app's on-device storage, not in Supabase; they do not sync across devices.
- This implementation does not encrypt draft text independently of the platform app sandbox. Do not treat it as an encrypted secret vault.
- Draft cleanup during account deletion is best-effort because local storage can fail. Server-side account deletion remains independent of local cleanup.
- Draft persistence is best-effort; a storage error must not block typing or sending.
