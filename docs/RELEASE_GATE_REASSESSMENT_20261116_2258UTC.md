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

- The Vercel team is `zanny-chat` / `team_P8IYvDiidDlhUHaQBe1RN1Wg`, Hobby plan. GitHub's Vercel integration bot identifies the `zannychat` project (`prj_OOi2wCB33VrD2oV1DiuGqmhezByZ`) and posts Ready PR preview URLs. The separately connected Vercel API integration returns zero projects for team-scoped search and 404 for project/deployment inspection; this is an access-scope discrepancy, not proof that the project is absent.
- A fresh team-consent request was generated on 2026-11-17. The team owner must open the current one-time link supplied in this conversation, review the permissions and approve. It expires after ten minutes.
- Project creation previously returned HTTP 403. Do not retry project creation until owner authorization and project visibility are reconciled; GitHub bot evidence already indicates that a `zannychat` project exists, so do not create a duplicate.
- GitHub Vercel bot comments confirm Ready previews for exact PR commits (including PR #119), while later bot comments report `api-deployments-free-per-day` after more than 100 deployments in 24 hours. A Ready preview is not evidence of production readiness.
- The connected Vercel API integration returns zero team-scoped projects and 404 for project/deployment inspection despite the GitHub bot's project ID evidence. The intended production alias `zannychat.vercel.app` remains unverified; no production deployment is claimed.
- Do not upgrade the Hobby plan or trigger further builds under the ₦0 budget. Reduce redundant PR-triggered builds, use Netlify previews for source acceptance, and re-check Vercel after the daily quota resets and API access is reconciled.

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


### Follow-up release checkpoint — 2026-11-17

- LIVE replay UI error/empty-state handling (PR #117) is merged, but Egress-to-private-storage-to-signed-playback remains a runtime acceptance gate because production replay inventory was empty.
- Account-deletion Google reauthentication is hardened and merged (PR #132); both relevant frontend workflows passed. Client proof is bound to the current Supabase user and expires at 4m30s, below the backend five-minute auth_time rule.
- Expo push-token device persistence/revocation (PR #119) is merged with frontend, Advanced Calling and Premium LIVE workflow success. Real push delivery and account-switch/logout still require device acceptance.
- PR #135 remains open to clear remaining account-owned Status UI state on shared-device account switches.
- No paid Vercel upgrade, production deploy, or physical-device acceptance is claimed.
