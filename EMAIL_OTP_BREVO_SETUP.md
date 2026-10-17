# Email verification with Supabase Auth + Brevo SMTP

## What the app now supports
- Email/password signup routes accounts requiring confirmation to a 6-digit code screen.
- The code is verified by Supabase Auth with `verifyOtp({ type: 'signup' })`.
- Users can request a replacement code through Supabase Auth's signup resend endpoint.
- OTP creation, expiry, attempt/rate limits, and email delivery remain server-side; the app never generates codes or contains SMTP credentials.

## Required dashboard configuration
1. In Brevo, verify the sender identity/domain and configure the DNS records Brevo provides (SPF/DKIM; DMARC is recommended).
2. In Supabase Dashboard → Authentication → SMTP Settings, enable custom SMTP and enter Brevo's SMTP host, port, login, and SMTP key. Keep the SMTP key private; do not put it in Expo environment variables or source control.
3. In Supabase Dashboard → Authentication → Email Templates, set the **Confirm signup** template to include the numeric token variable `{{ .Token }}`. The email should clearly say it is the ZannyChat signup code and should not include a clickable confirmation link if you want the in-app code flow.
4. Ensure email confirmation is enabled for the project and set appropriate OTP expiry/rate limits in Supabase Auth settings.
5. Test with a fresh email address: sign up, receive the code, verify successfully, reject an incorrect/expired code, and resend after the configured rate limit permits it.

## Notes
- Google OAuth users normally verify through Google and do not use this email OTP screen.
- A resend response is intentionally generic; it does not reveal whether an address is registered.
- Source changes are not deployed by this pass. Run the hosted end-to-end test before release.
