# Channel post retry safety — 1.2.122

Channel publishing now supplies a client request ID that is reused after a failed response, and blocks concurrent taps while a publish is in flight. Backend release 1.2.43 uses the additive migration `0046_channel_post_idempotency.sql` to store a nullable request ID and enforce uniqueness per channel and author. Repeated requests return the existing post instead of creating a second copy.

**Deployment requirement:** apply migration 0046 before deploying backend 1.2.43. Existing clients that omit the request ID remain compatible. The migration and backend source are included in the delivery bundle; this edit does not itself deploy to production.
