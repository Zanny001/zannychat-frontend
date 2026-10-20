# Message delivery receipts — frontend 1.2.64 / backend 1.2.18

## What changed
- Added `message_delivery_receipts`, keyed by `(message_id, user_id)`, with a per-conversation index and realtime publication.
- Recipients can insert only their own delivery receipt for a message from another participant in a conversation they belong to. Reads are limited to conversation participants; anonymous/public grants are revoked.
- The frontend records delivery acknowledgements for incoming messages fetched in the current/older page and incoming realtime messages, and listens for receipt inserts.
- In one-to-one chats, outgoing bubbles show a neutral double tick for delivered and the theme-colored double tick for read. A read cursor takes precedence over a delivery receipt. Optimistic messages remain pending. Group ticks remain conservative; group delivery receipts are recorded but not shown as a full per-member delivery UI.

## Meaning and limitations
A receipt means the authenticated recipient client fetched/received the message record. It is not proof that a push notification appeared on the lock screen or that a person saw the message. Delivery is not end-to-end encrypted. Receipts depend on migration `0031_message_delivery_receipts.sql`, Supabase RLS, Realtime publication, and a client with the new frontend.

## Verification
Frontend unit tests and release audit run locally. Backend migration policy tests check the table, uniqueness, membership scoping, and self-only acknowledgement. No live Supabase migration, two-account RLS test, Expo native build, physical-device test, or production deployment was performed.
