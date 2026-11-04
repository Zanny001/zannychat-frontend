# ZannyChat 1.2.144 — Status Privacy Recovery

## Scope

This release hardens the Status audience/privacy contact picker when its contact or exclusion requests fail.

- Clears stale contact and exclusion rows on failed privacy-data loads.
- Clears a previously selected audience when the eligible-contact list could not be refreshed.
- Displays an accessible inline error and a retry action in the privacy modal.
- Disables contact selection and bulk exclusion/allow actions while privacy data is unavailable.
- Adds unit tests for fail-closed load state and safe fallback error messaging.

## Validation

Run from `zannychat-frontend-main`:

```sh
node --experimental-default-type=module --test src/utils/*.test.js
python3 scripts/audit_frontend_release.py
```

This is a source-only release. It does not update production services. Backend enforcement, full Expo builds, and device-level privacy tests remain separate release gates.
