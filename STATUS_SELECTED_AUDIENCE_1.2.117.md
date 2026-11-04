# Selected-contact Status audience — frontend 1.2.117

The Status composer now offers three audience modes:

- **My contacts:** eligible users who share a conversation with the publisher, except anyone the publisher has globally excluded.
- **Selected:** only explicitly selected contacts or group members who share a conversation with the publisher, again subject to global exclusions.
- **Only me:** visible only to the publisher.

The selected mode applies to text, photo, and video status publishing. It requires at least one recipient. The app stores selected recipients in `status_audience_recipients`; the database validates that each recipient shares a conversation with the owner. RLS and `can_view_status` enforce visibility for status rows, private media, receipts, reactions, and replies.

**Deployment dependency:** apply `supabase/migrations/0044_selected_status_audiences.sql` after migration `0043_scheduled_messages.sql` before deploying the frontend. Without that migration, the selected audience is not production-ready. This package does not apply migrations or deploy production.
