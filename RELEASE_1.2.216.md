# ZannyChat 1.2.216 — Member discovery experience

- Adds a polished, accessible member search to New Chat, including case-insensitive name/status matching, clear-search affordance, member counts, and an online-now filter.
- Keeps QR connect and new-group actions visible in the discovery header.
- Adds a pure filter helper with regression tests and stable alphabetical sorting.
- This discovers existing ZannyChat profiles; it does not yet match the device address book to registered accounts. That requires a privacy-preserving phone-number discovery flow and verified phone-number infrastructure, which are not present in the current profile schema.
- No backend or database changes. Production deployment and device testing not performed.
