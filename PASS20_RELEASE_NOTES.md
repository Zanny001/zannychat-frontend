# Pass 20 — Release audit repair

## Change
- Restored the missing `frontend/scripts/audit_frontend_release.py` expected by `npm run audit:release`.
- Corrected the audit script's source-root resolution so it checks the actual app folder in this archive.
- Audit checks auth screens, email OTP and Google OAuth wiring, absence of active wallet screen, obvious committed service-role/SMTP/private-key literals, private-media notes, Brevo setup notes, environment files, and package manifest.

## Validation
- Frontend unit tests: 45/45 passed.
- Frontend release audit: 11/11 passed after repair.
- Backend health/unit tests: 14/14 passed.
- Chat deletion static checks: 2/2 passed.
- Conversation error-disclosure tests: 2/2 passed.
- Route error-disclosure tests: 3/3 passed.
- Wallet-removal regression checks: 2/2 passed.

## Limits
Static checks only. No live SMTP delivery, Google OAuth session test, Supabase RLS integration, physical-device test, dependency audit, or production deployment is claimed.
