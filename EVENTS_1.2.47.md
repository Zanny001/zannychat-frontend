# Conversation Events — Frontend 1.2.47 / Backend 1.2.2

Adds a first conversation-scoped event slice: create an event with a title, optional description/location, and future date/time; view upcoming events; and RSVP Going / Maybe / Can't go. Event records and RSVP changes use database RPCs; RLS limits reads to conversation participants and anonymous access is revoked.

Requires Supabase migration `0018_conversation_events.sql`. Date/time input is interpreted in the device's local timezone. This is not a full calendar integration: no reminders/push, recurring events, attendee invitations outside the conversation, edits/cancellation, or event media are included. The migration is source-only and has not been applied to production.
