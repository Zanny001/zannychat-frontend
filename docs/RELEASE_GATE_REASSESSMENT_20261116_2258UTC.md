# ZannyChat release-gate reassessment — 2026-11-17

## Purpose and evidence boundary

This is a dated addendum to `FULL_APP_AUDIT_AND_RELEASE_REGISTER_20261116.md`. It records a refreshed production advisor read, Vercel connection state, and direct inspection of the current web deployment configuration. It does not certify production acceptance.

## Supabase production status

- Project `vithpppgyjmazxvogvno` remains `ACTIVE_HEALTHY`, PostgreSQL 17.6.1.155, region `eu-central-1`.
- The 2026-11-16 22:58 UTC Security Advisor snapshot reported:
  - 37 RLS-enabled tables without policies. Earlier direct catalog/privilege review found these tables have no anon/authenticated table privileges; they are service-role/backend-only. Do not add blanket policies to silence the informational lint.
  - 28 authenticated-callable SECURITY DEFINER functions. These were individually inspected in the prior audit; their authorization checks, pinned search paths, and role grants were reviewed. Keep this as a regression watch, not an automatic instruction to revoke every RPC.
  - One actionable Auth warning: leaked-password protection is disabled.
- The Performance Advisor reported 61 unused indexes. This is a low-traffic signal only. No index was dropped; gather representative query/usage evidence before any removal.

## Auth hardening decision

Supabase documentation confirms that leaked-password protection uses the HaveIBeenPwned Pwned Passwords API and is available on the Pro plan and above: https://supabase.com/docs/guides/auth/password-security

The standing operating budget is ₦0, so no upgrade or paid change was initiated. The connected project metadata does not expose its current Supabase billing tier; this audit does not claim the project is on Free or that the setting is unavailable on its current tier. Verify the billing tier in the Supabase dashboard before deciding. No Auth setting was changed in this pass.

## Web security configuration review

Direct inspection of the frontend main-branch `vercel.json` confirms these headers are configured: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, a camera/microphone/geolocation Permissions-Policy, HSTS with a one-year max-age and `includeSubDomains`, and a Content-Security-Policy containing only `frame-ancestors 'none'; base-uri 'self'; object-src 'none'`.

The CSP is a partial hardening policy, not a complete restrictive policy: it currently lacks `default-src`, `script-src`, `style-src`, `img-src`, `connect-src`, `font-src`, `media-src`, `worker-src`, and `form-action`. This is a confirmed configuration gap. I have deliberately not pushed an untested restrictive policy: the repository evidence available in this pass does not establish a complete runtime inventory of OAuth, Supabase, Render, LiveKit, remote media, and Expo-generated web asset origins. An overly narrow policy could silently break sign-in, calls, image/video rendering or the app shell. The safe next step is to inventory the built `dist` output and observed browser network requests, then stage a CSP in Report-Only mode and test all critical flows before enforcement.

The existing `vercel.json` also rewrites every path to `/index.html`, uses `npm ci`, runs `npm run build:web`, and publishes `dist`. Expo app configuration declares the `zannychat` deep-link scheme and Android auth/reset/contact intent filters. These source declarations still require deployed URL and device callback acceptance.

## Vercel authorization and deployment

- The Vercel team is `zanny-chat` / `team_P8IYvDiidDlhUHaQBe1RN1Wg`, Hobby plan, with zero linked projects returned by the connected context.
- A fresh team-consent request was generated on 2026-11-17. The team owner must open the current one-time link supplied in this conversation, review the permissions and approve. It expires after ten minutes.
- Project creation previously returned HTTP 403. Do not retry project creation until approval is completed.
- The GitHub commit currently reports a Vercel status check as pending, but a direct Vercel deployment-history query for the exact commit returned zero records and lookup of the check's deployment identifier returned 404. Treat this as an unresolved/stale integration check, not as evidence of a preview deployment.
- No Vercel project, alias, preview deployment, or production deployment is claimed by this addendum.

## Release gates that remain open

1. Approve Vercel team authorization, create/link the `zannychat` project, deploy the Expo web export, then verify auth redirects, CORS, deep links, refresh routing, media, calls and security headers on the actual deployment.
2. Inventory the built web bundle and browser network origins; deploy CSP in Report-Only mode; validate Google sign-in, Supabase, Render, LiveKit, remote media and Expo assets; only then enforce a restrictive policy.
3. Build and install production-configured Android binaries on two physical devices; test call audio/video, incoming/background lifecycle, Bluetooth, reconnect, group promotion, LIVE creator/guest/viewer roles and replay Egress-to-private-storage-to-playback.
4. Complete messaging offline/online recovery, attachment retry, notification delivery and multi-device consistency.
5. Continue the 48-experience Crown Aurora screen programme. All screen entries remain incomplete until visual, responsive, keyboard, accessibility, data-state and platform regression checks pass.
6. Do not advertise end-to-end encryption, synchronized device-local Saved Messages/Chat Folders, audience reach/earnings analytics, or LIVE replay availability without implementation and runtime evidence.

## Decision log

- No paid Supabase or Vercel upgrade was initiated.
- No production database schema, RLS policy, storage policy, Auth setting, or index was changed in this reassessment.
- No CSP was deployed or changed; current policy gap is documented pending origin inventory and Report-Only validation.
- This is a documentation-only audit checkpoint; all runtime and physical-device gates remain explicitly open.
