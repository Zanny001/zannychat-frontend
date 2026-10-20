# ZannyChat frontend 1.2.50 — Group management UI

This release adds a Group members screen linked from the group-chat header. It loads the roster through the authenticated backend, displays admin/member roles, and exposes promote/demote, remove-member, and leave-group actions. Server responses remain authoritative; failed operations are surfaced to the user and are not represented as successful local changes.

Requires backend 1.2.4 and database migration `0019_group_administration.sql`. The roster endpoint checks authenticated group membership before returning member profiles. Invite links, join requests, granular permissions, and admin audit logs are not included.
