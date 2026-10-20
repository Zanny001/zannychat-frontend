# Group message receipt details — frontend 1.2.83

The message action menu now offers **View message status** for confirmed messages sent by the current user in a group. It lists each other member and the strongest locally available status:

- **Read** — that member's `last_read_at` cursor is at or after the message timestamp.
- **Delivered** — the per-message delivery receipt exists, but the read cursor does not establish that the member has read it.
- **Awaiting delivery receipt** — neither a qualifying read cursor nor a delivery receipt is available. This does not prove that the device has not received the message; receipts can be delayed or unavailable.

The sender is excluded from the list, optimistic temporary messages are excluded, and the native alert is capped at 12 names to avoid an excessively long dialog. This is a client-side view over existing receipt data; no database migration is required. Group read state remains cursor-based, not a cryptographic or per-device proof of reading.

Validation: frontend unit tests cover read-vs-delivered precedence, pending and invalid messages, sender exclusion, and fallback names. Hosted integration and physical-device validation remain outstanding.
