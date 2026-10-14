# Account deletion — ZannyChat 1.2.14

The Privacy & security screen now offers permanent account deletion for live accounts. The user must enter their current password and type `DELETE`. The frontend re-authenticates with Supabase Auth; the backend independently requires a recently authenticated JWT (`auth_time` no more than five minutes old), rate-limits attempts, and deletes only the authenticated user's account through the Supabase Admin API.

## Data behavior

- The account profile and its dependent rows are removed by the existing `auth.users` → `profiles` cascade.
- Direct conversations are removed transactionally when their membership falls below two users.
- Group conversations remain for other members; the deleted user's membership and authored messages are removed.
- Replies pointing at a deleted message are retained with a null reply target, avoiding a foreign-key block.
- This is permanent and cannot be undone. Reports tied to deleted profiles may be removed through existing cascading foreign keys; this is a policy decision that should be reviewed before launch if regulatory retention of abuse reports is required.

## Required setup and tests

1. Apply `zannychat-backend/supabase/migrations/0013_account_deletion_integrity.sql` to a **non-production** Supabase database first.
2. Run `zannychat-backend/supabase/tests/0013_account_deletion_integrity.sql` with the existing security-invariant tests.
3. Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only on the backend. Never add the service-role key to the Expo app.
4. Run backend Jest tests and test deletion with disposable accounts in a non-production project, including a direct conversation, group, and reply chain.
5. Confirm privacy policy and support process match the deletion behavior and any applicable data-retention obligations.

The source includes a Jest test suite for the backend route. Tests and SQL checks are added but were not executed against a live Supabase project in this environment. No production account or database was touched.
