# Status updates — frontend 1.2.45

This release adds a text-only Status Updates screen backed by the Supabase `status_updates` table (migration `0016_text_status_updates.sql`).

- Text is limited to 700 characters.
- Status expiry is set to 24 hours after creation.
- Audience choices are `contacts` or `only_me`.
- The contact policy defines contacts conservatively as accounts sharing at least one conversation.
- Users can list active updates and delete their own updates.
- Anonymous access is revoked; authenticated table access is constrained by RLS.

## Required setup

Apply `supabase/migrations/0016_text_status_updates.sql` to the target Supabase project before using this screen with a configured backend. The app does not apply database migrations automatically. The status feature requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the client environment.

## Known limitations

This is a text-only first slice. Image/video stories, contact-specific exclusion lists, muting, viewer receipts, reactions/replies, background expiry cleanup, and a dedicated realtime subscription are not implemented. Expired rows are hidden by the read policy/query but remain in the database until a future cleanup job is configured. This source change has not been deployed or tested against the production Supabase project.
