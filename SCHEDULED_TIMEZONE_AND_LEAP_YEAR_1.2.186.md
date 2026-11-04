# Scheduled timestamp timezone and leap-year consistency — 1.2.186

- Align frontend timezone-offset validation with the backend ISO-8601 limit: maximum absolute offset is 14:00, never 14:01 or 23:59.
- Calculate month lengths with the Gregorian leap-year rule rather than `Date.UTC(year, ...)`, which remaps years 0–99 to 1900–1999.
- Keep frontend and backend validation aligned and add regression cases for invalid offsets, non-leap century years, and year 0000.

## Verification

Run the frontend utility suite and backend scheduled-message date tests before deployment. This source release does not apply database migrations or deploy production services.
