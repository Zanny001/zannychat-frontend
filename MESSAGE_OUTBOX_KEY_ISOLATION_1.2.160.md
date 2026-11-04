# Message Outbox Key Isolation — 1.2.160

The outgoing-message queue now encodes user and conversation identifiers before building its AsyncStorage key. This prevents delimiter collisions where different user/conversation pairs could otherwise map to the same key. Ordinary IDs keep the existing v1 key shape, preserving compatibility for common identifiers; IDs containing reserved delimiters use an encoded key. Missing conversation IDs are rejected, and malformed Unicode identifiers are normalized deterministically.

This is client-side storage isolation. It does not replace server-side authorization or idempotency.
