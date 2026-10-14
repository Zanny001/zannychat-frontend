# Password change — release 1.2.9

The Privacy & security screen now includes a real password-change form for a signed-in Supabase account. It validates an 8–128 character password, requires confirmation, calls Supabase Auth `updateUser`, clears the fields after success, and exposes disabled controls in mock mode rather than pretending a change was saved. Errors are surfaced to the user and a missing returned user is treated as a likely expired session.

## Validation

- Frontend utility unit tests: run `npm run test:unit` from `zannychat-frontend`.
- Static JavaScript/JSX parsing and backend syntax checks are recorded in the release verification log.
- A live password update still requires a configured Supabase project and authenticated test account; it has not been performed by this offline release preparation.
