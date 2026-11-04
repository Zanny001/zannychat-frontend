# Scheduled-message timestamp validation — 1.2.185

The backend now validates scheduled-message timestamps before inserting them. It requires an ISO-8601 date-time with an explicit UTC marker or numeric timezone offset, verifies calendar and clock fields without accepting JavaScript's date normalization, and retains the existing scheduling window of one minute through 30 days from the server clock.

The new backend unit tests cover leap days, invalid month/day/hour/minute/second values, invalid timezone offsets, malformed inputs, and both scheduling-window boundaries.
