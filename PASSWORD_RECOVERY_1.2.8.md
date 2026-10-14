# ZannyChat 1.2.8 — password recovery and signup validation

## Included
- Shared email normalization and validation helpers.
- Signup validation for name length, email shape, password length (8–128), and matching confirmation.
- Login validation before making an auth request.
- Password recovery request UI and generic confirmation copy to avoid account enumeration.
- Password reset deep-link handler for `zannychat://reset-password`, including token parsing, Supabase `setSession`, and `updateUser`.
- Dependency-free unit tests for email/signup validation and recovery token parsing.

## Supabase setup required for a real reset email
1. In Supabase Auth URL configuration, add `zannychat://reset-password` to the allowed redirect URLs.
2. Configure the project email provider and verify password recovery emails are delivered.
3. Test the recovery link on a development build with the `zannychat` URL scheme registered.
4. Confirm expired and malformed links fail safely, and that a successfully updated password can sign in.

The reset email flow does not send mail in mock mode. The UI explicitly indicates that a backend is required. No production credentials are included in the package.

## Validation run in this environment
`node --experimental-default-type=module --test src/utils/*.test.js`

The test command covers utility-level behavior only. It does not replace a device test of deep linking or a real Supabase Auth integration test.

## Signup confirmation behavior
When Supabase returns a user without an active session, the app no longer navigates into the authenticated chat area. It shows a generic check-your-email message and returns to sign-in. Mock mode explicitly returns a mock session so demo onboarding continues.
