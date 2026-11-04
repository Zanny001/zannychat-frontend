# Scheduled date validation — 1.2.182

Scheduled-message input validation now rejects impossible calendar dates and out-of-range time fields before parsing. This avoids JavaScript date parsing silently rolling dates such as February 30 into March. Valid leap days remain accepted.

Validation remains bounded to a minimum one-minute lead time and a maximum 30-day scheduling horizon. Tests cover impossible month/day/time values and a valid leap day.

This is a frontend validation improvement, not proof that scheduled delivery is active: actual delivery still depends on the backend worker being configured and running.
