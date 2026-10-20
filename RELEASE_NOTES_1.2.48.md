# ZannyChat frontend 1.2.48

## Added
- Group messages can show `Seen by N` when other participants' existing `last_read_at` cursors have advanced past the message timestamp.
- Count logic is isolated and unit-tested for sender exclusion, invalid timestamps, and unread cursors.

## Accuracy note
This is an approximate group read count based on conversation-level read cursors, not exact per-message receipts. No migration is required. Full verification against production Supabase realtime and physical devices has not been performed.
