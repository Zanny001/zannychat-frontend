# Attachment retry diagnostics — 1.2.44

Failed manual attachment retries now persist bounded diagnostic metadata (`attempts`, `lastAttemptAt`, and a truncated `lastError`) in the local per-user/per-conversation attachment outbox. The conversation screen updates its in-memory queue after failure and keeps the item available for a later manual retry.

This is local diagnostics only: it does not guarantee the referenced file still exists, retry in the background, or prove an attachment message was delivered. Message insert outcomes that are uncertain continue to be handled separately to avoid blind duplicate sends.
