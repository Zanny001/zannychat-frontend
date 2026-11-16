# ZannyChat release-gate reassessment — 2026-11-16 22:58 UTC

## Purpose and evidence boundary

This is a dated addendum to `FULL_APP_AUDIT_AND_RELEASE_REGISTER_20261116.md`. It records a fresh production advisor read and the current deployment authorization blocker. It does not certify production acceptance.

## Supabase production status

- Project `vithpppgyjmazxvogvno` remains `ACTIVE_HEALTHY`, PostgreSQL 17.6.1.155, region `eu-central-1`.
- A fresh Security Advisor read at 2026-11-16 22:58:25 UTC continues to report:
  - 37 RLS-enabled tables without policies. Earlier direct catalog/privilege review found these tables have no anon/authenticated table privileges; they are service-role/backend-only. Do not add blanket policies to silence the informational lint.
  - 28 authenticated-callable SECURITY DEFINER functions. These were individually inspected in the prior audit; their authorization checks, pinned search paths, and role grants were reviewed. Keep this as a regression watch, not an automatic instruction to revoke every RPC.
  - One actionable Auth warning: leaked-password protection is disabled.
- A fresh Performance Advisor read reports 61 unused indexes (down from the prior recorded 62). This is a low-traffic signal only. No index was dropped; gather representative query/usage evidence before any removal.

## Auth hardening decision

Current Supabase documentation confirms that leaked-password protection uses the HaveIBeenPwned Pwned Passwords API and is available on the Pro plan and above: https://supabase.com/docs/guides/auth/password-security

The user's standing budget constraint is ₦0, so no upgrade or paid change was initiated. The connected project metadata does not expose its current Supabase billing tier; therefore this audit does not claim the project is on Free or that the setting is unavailable on its current tier. If the project is on Free, enabling this feature requires a Pro upgrade. Verify the current tier in Supabase billing before deciding. No Auth setting was changed in this pass.

## Vercel authorization and deployment

- The Vercel team is `zanny-chat` / `team_P8IYvDiidDlhUHaQBe1RN1Wg`, Hobby plan, with zero linked projects returned by the connected context.
- A search immediately before opening this documentation PR found no pre-existing open PRs in either repository.
- Project creation previously returned HTTP 403. A fresh one-time team-consent request was generated on this connection; the team owner must open the current link supplied in the ChatGPT conversation, review permissions and approve it. The link expires after ten minutes and can only be used once.
- Do not retry project creation until approval is completed. No Vercel project, alias, or production deployment is claimed by this addendum.

## Release gates that remain open

1. Approve Vercel team authorization, create/link the `zannychat` project, deploy the Expo web export, then verify auth redirects, CORS, deep links, refresh routing, media, calls and security headers on the actual deployment.
2. Build and install production-configured Android binaries on two physical devices; test call audio/video, incoming/background lifecycle, Bluetooth, reconnect, group promotion, LIVE creator/guest/viewer roles and replay Egress-to-private-storage-to-playback.
3. Complete messaging offline/online recovery, attachment retry, notification delivery and multi-device consistency.
4. Harden and validate a complete CSP only after inventorying actual script, API, OAuth, LiveKit and media origins. Current CSP intentionally remains a limited policy (`frame-ancestors`, `base-uri`, `object-src`) until a tested allowlist is prepared.
5. Continue the 48-experience Crown Aurora screen programme. All screen entries remain incomplete until visual, responsive, keyboard, accessibility, data-state and platform regression checks pass.
6. Do not advertise end-to-end encryption, synchronized device-local Saved Messages/Chat Folders, audience reach/earnings analytics, or LIVE replay availability without implementation and runtime evidence.

## Decision log

- No paid Supabase or Vercel upgrade was initiated.
- No production database schema, RLS policy, storage policy, Auth setting, or index was changed in this reassessment.
- This is a documentation-only audit checkpoint; all runtime and physical-device gates remain explicitly open.
