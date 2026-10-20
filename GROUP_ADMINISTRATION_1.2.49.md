# Group administration API — frontend 1.2.49

This release exposes `setGroupMemberAdmin(conversationId, memberId, isAdmin)` and `removeGroupMember(conversationId, memberId)` in `src/services/api.js`. Both require the configured Supabase account and backend; they fail closed in mock/offline mode rather than reporting local-only changes as persisted.

The backend must be upgraded to 1.2.3 and migration `0019_group_administration.sql` must be applied first. The API functions are groundwork for the group-management screen, which is not yet implemented. Validate with multiple real accounts after deployment.
