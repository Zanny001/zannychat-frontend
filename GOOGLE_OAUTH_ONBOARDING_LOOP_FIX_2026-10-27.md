# Google OAuth onboarding-loop fix — 2026-10-27

## Source changes

- Replaced the stale hard-coded `https://zannychat.netlify.app` OAuth redirect in Login and Signup with `getOAuthRedirectUrl()`, which uses the current origin on web.
- Added a Supabase auth-state listener to synchronize the initial route after sign-in/sign-out.
- Prevented `TOKEN_REFRESHED` from resetting navigation and interrupting active conversations/calls.
- Prevented duplicate push-token registration when `SIGNED_IN` and initial session restoration overlap.
- Prevented a failed parallel `getSession()` from overwriting a sign-in event and sending the user back to onboarding.
- Avoided recreating the incoming-call subscription when the authenticated user ID is unchanged.

## Required operator configuration

1. In Supabase Dashboard → Authentication → URL Configuration, set the Site URL to `https://zannychat-app.netlify.app` and allow the exact production URL plus only the preview/development patterns you actually use.
2. In Google Cloud OAuth client configuration, use the Supabase Auth callback URL displayed in Supabase's Google provider setup as the authorized redirect URI.
3. Deploy the corrected frontend source, then test Google sign-in with a dedicated staging account and verify that the browser returns to the deployed frontend, the session persists after refresh, and the app opens Main/Chats.
4. For native builds, separately configure `zannychat://auth/callback` in Supabase and implement/verify the native browser callback + session exchange. The helper alone does not complete native OAuth.

## Validation

- Regression tests: `python3 -m unittest discover -s tests -p 'test_*.py'`.
- JavaScript unit tests: `node --experimental-default-type=module --test src/utils/*.test.js src/services/*.test.js`.
- Release static checks: `python3 scripts/audit_frontend_release.py`, `python3 scripts/check_release_contract.py`, `python3 scripts/release_readiness.py`.

This source fix has not been deployed to Netlify, and no live Google OAuth sign-in was performed in this workspace.
