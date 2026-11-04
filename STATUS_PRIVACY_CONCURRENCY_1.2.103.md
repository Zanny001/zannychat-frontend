# Status privacy reliability — v1.2.103

- Prevents overlapping contact-level Status privacy writes by locking contact rows while a write is in progress.
- Uses `try/finally` to release the lock after success or failure.
- Adds an accessibility live-region summary of the current search match count and total excluded contacts.
- Adds regression coverage for write locking and the summary.

Validation: run `npm run test:unit` and `npm run audit:release` in an environment with the required project tooling. This source increment does not change database policies or claim that audience changes were verified against production.
