# ZannyChat production stabilisation hotfix — source audit

## Confirmed source defects corrected

1. **Chat list relationship ambiguity:** the conversations query embedded `messages(...)` without naming the foreign key. The messages table has multiple relationships, so PostgREST could reject the embed with “more than one relationship was found”. The embed now explicitly uses `messages!messages_conversation_id_fkey(...)`.
2. **Outgoing call setup race:** both native and web call screens required the session to already be `accepted` before starting their caller-side setup. The caller enters the call screen while the session is `ringing`, so setup aborted before it could wait for the callee to answer. Callers may now initialise during `ringing` or `accepted`; callees still require `accepted` before media permissions are used.

## Follow-on implementation prepared for 1.2.238

- Added `delete_message` RPC migration `0065_message_deletion_modes.sql`: per-viewer hiding for any participant and sender-only global retraction. Global retraction preserves a timeline tombstone while clearing text and attachment references.
- Added frontend controls for “Delete for me” and (for the sender) “Delete for everyone”.
- Corrected outgoing bubble foreground colours: light-theme bubbles now use dark text and metadata colours; dark-theme bubbles retain white foregrounds.
- Added backend migration contract tests and frontend theme contrast tests.

## Automated checks

- Frontend unit suite: 422 passed before this hotfix; targeted regression tests added for the two fixes.
- Frontend release audit: 22/22 passed.
- Backend call-signaling suite: 13 passed.
- Backend status migration tests: 2 passed.
- Backend conversation error-disclosure tests: 2 passed.
- Release-contract script could not run in this extracted layout because it expects a sibling directory named `zannychat-back`; the supplied backend folder is named `zannychat-backend-main`. This is a test harness path assumption, not a confirmed product defect.

## Not yet certified / deployment gates

- No production credentials or authenticated database session were supplied, so no Render, Netlify, Supabase, or Google Cloud settings were changed.
- TURN reachability and real device-to-device audio/video calls require a two-device production smoke test. STUN-only fallback is not sufficient on every carrier/NAT.
- Google OAuth on Android requires the standalone app's `zannychat://auth/callback` redirect to be allow-listed in Supabase Auth and the matching Google OAuth client configuration. A rebuilt Android binary is required after native linking/scheme changes.
- Status publishing code has a publish handler and storage/database operations, but end-to-end publishing still needs a real authenticated account, storage bucket/policies, and device upload test.
- Message deletion currently uses a global soft-delete tombstone for the sender's own message. A complete “Delete for me” implementation for received messages, “Delete for everyone” author-only enforcement, and safe media cleanup needs a dedicated schema/API/UI migration; it is not silently approximated in this hotfix.
- Profile editing currently exposes name, status and avatar only; adding structured profile fields requires confirming the intended schema and privacy controls first.

## Deployment notes for migration 0065

Apply migrations in order through `0065_message_deletion_modes.sql` only after confirming the production migration ledger is at `0064`. The migration is additive and does not delete existing messages. Run the backend migration tests before applying. Global retraction clears attachment references but does not yet perform asynchronous Storage object garbage collection; storage cleanup must be handled by a privileged retention worker before claiming complete physical erasure.

## Data safety

No existing data was deleted or rewritten. No database migration was executed.
