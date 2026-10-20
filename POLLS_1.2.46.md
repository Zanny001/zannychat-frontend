# Polls — frontend 1.2.46 / backend 1.2.1

Adds single-choice polls to conversations. Open a conversation overflow menu and choose **Polls** to create a poll with 2–10 options or vote/change a vote. Questions are limited to 240 characters and options to 120 characters. Polls may optionally be closed using the database API; the current screen creates open polls by default.

Requires Supabase migration `0017_polls.sql`. Creation and voting use security-definer RPCs that validate authentication, conversation membership, option membership, limits, and closed-poll state. Poll data is not available to anonymous clients. Apply the migration before enabling the feature in production. No production database or deployment was changed by this source delivery.

Current limitations: single-choice only; no poll notifications, multi-select, quiz mode, scheduled closing UI, or event/calendar support. Voting totals are visible to conversation members. Real database integration and device tests remain required.
