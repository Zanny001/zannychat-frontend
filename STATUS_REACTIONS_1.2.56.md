# Status reactions — frontend 1.2.56

Adds six emoji reactions to contact-visible statuses. A viewer may select one reaction per status, change it, or tap the selected emoji again to remove it. Reactions are aggregated in the status viewer. The database migration `0024_status_reactions.sql` must be applied after migrations 0022 and 0023. RLS restricts reading/reaction creation to active, eligible contact-visible statuses and viewers manage only their own reaction.

Validation performed: frontend unit and release audits plus backend static migration tests. No live Supabase integration or production deployment is claimed.
