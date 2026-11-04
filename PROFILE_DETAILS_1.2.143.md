# Profile details refinement — 1.2.143

- Added an optional “More about” profile section for explicitly supplied pronouns, location, work, website, birthday, and languages.
- Supports common backend field aliases and language arrays.
- Omits empty, malformed, or absent values; the UI does not infer profile details.
- Added focused utility tests for value filtering, aliases, arrays, and missing-data behavior.

## Validation

Run `node --experimental-default-type=module --test src/utils/*.test.js` and `python3 scripts/audit_frontend_release.py` from the frontend directory.

This source-only pass does not deploy production services or verify backend authorization for profile fields.
