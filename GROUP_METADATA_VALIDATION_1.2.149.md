# Group metadata validation — 1.2.149

- Added a shared validator for group name, topic, description and announcement-mode metadata.
- Trims surrounding whitespace before saving so the API receives the same normalized values users see after save.
- Validates required name and documented field limits before making a network request.
- Rejects unsupported control characters while permitting normal newlines and tabs in descriptions.
- Displays an accessible native alert with the validation issues and prevents invalid saves.

## Verification

Run `npm run test:unit` and `npm run audit:release` from the frontend directory. This client-side validation complements, but does not replace, server-side validation and authorization.
