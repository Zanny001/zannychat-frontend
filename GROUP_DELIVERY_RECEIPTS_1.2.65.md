# Group delivery counts — frontend 1.2.65

Group message bubbles now show `Delivered to N` when one or more recipients have acknowledged fetching/receiving that exact message. `Seen by N` remains a separate, best-effort count derived from conversation participant read cursors. Delivery count is only shown for outgoing group messages with known participants; if participant metadata is unavailable, the count is omitted instead of guessed.

This uses backend 1.2.18 migration `0031_message_delivery_receipts.sql`; no additional database migration is required. Frontend tests cover recipient counting and one-to-one state precedence. Live two-account/group RLS and device tests remain outstanding.
