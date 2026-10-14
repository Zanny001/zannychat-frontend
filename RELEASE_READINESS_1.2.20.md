# ZannyChat 1.2.20 — release readiness

## Implemented
- Conversation overflow navigation to Shared Media.
- Photos, Files, Links tabs and count labels.
- Bounded pagination of older messages, retryable errors, and empty states.
- Safe HTTP(S) link extraction (rejects malformed, credential-bearing, and non-HTTP(S) URLs).
- Full-screen image preview and platform handoff for other attachments.
- Unit tests for shared content classification and link safety.

## Verification still required
1. Run Expo Android and iOS builds with the supported dependency lock/install.
2. Validate shared media against a staging Supabase project, including signed-link expiry and RLS.
3. Test very large histories, duplicate timestamps, file handlers, screen readers, and small-screen layouts on devices.
4. Run backend Jest and SQL/RLS suites against disposable staging resources.
5. Complete security review before production release.

No production deployment or live database mutation was performed.
