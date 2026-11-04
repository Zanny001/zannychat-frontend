# ZannyChat 1.2.174 — Status Media Cleanup Owner Metadata

- Fixed expired Status cleanup query to select `user_id`, which the safe path validator requires.
- Previously, the validator received rows without owner metadata and rejected every path; expired rows could then be removed while their media objects were left behind.
- Added a regression test tying the service query selection to the helper's owner-isolation requirement.
- This is a source-only fix. No Supabase migration or live deployment was performed.
