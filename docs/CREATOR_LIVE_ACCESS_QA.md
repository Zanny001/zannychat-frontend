# Creator LIVE access QA (release 1.2.241)

This checklist covers the follower-only, private-invitation, and guest-participation workflows. It requires a staging Supabase project with the new LIVE access migration applied, a configured LiveKit SFU, and at least four test accounts.

## Test accounts

- **Creator** — starts the broadcast.
- **Follower** — follows the creator through a public LIVE card.
- **Non-follower** — has not followed the creator.
- **Private invitee** — shares a chat with the creator and is selected from the invite picker.
- **Guest requester** — joins as a viewer and requests a guest slot.
- **Blocked account** — use a pair where either account blocks the other.

## Follower-only broadcast

- [ ] Creator starts a broadcast with visibility set to Followers.
- [ ] Existing follower sees the broadcast under Live now and joins successfully.
- [ ] Non-follower cannot join by opening the stream ID directly.
- [ ] User who unfollows cannot start a new join.
- [ ] A block in either direction prevents follow, discovery, and admission.
- [ ] Public broadcasts remain visible to all signed-in users.

## Private broadcast and invitations

- [ ] Creator selects one or more people from shared chat contacts and starts a Private broadcast.
- [ ] Stream creation and initial invitations succeed or fail together; a failed invite insert must not leave an orphan private stream.
- [ ] Invitees see the pending invitation in the LIVE hub and can join.
- [ ] A non-invitee cannot join even if they know the stream UUID.
- [ ] A block added after invitation prevents admission and hides the invitation from the invitee's hub.
- [ ] Duplicate, malformed, self, missing, or blocked invitees are rejected.
- [ ] Additional invitations can be sent through the creator-only invite endpoint.

## Guest participation

- [ ] Creator enables guest participation before starting the broadcast.
- [ ] Joined viewer sees the request-to-join-stage control.
- [ ] Creator sees pending requests and can approve or decline them.
- [ ] Declined request remains a viewer and cannot publish audio/video.
- [ ] Approved viewer sees approval within the polling window (up to 15 seconds) and can rejoin as a guest.
- [ ] Guest receives a publishing-capable LiveKit token and can publish permitted media tracks.
- [ ] Ordinary viewers retain subscribe-only media permissions.
- [ ] Viewer cannot request guest access when guests are disabled or when not joined.
- [ ] A block or departure before approval prevents the creator from approving that stale request.
- [ ] Guest can leave without ending the creator's stream.

## Delivery and operational limitations

- Private invitations are currently surfaced in the LIVE hub; no push notification is sent for a new private invitation.
- Guest approval is surfaced by in-room polling; no push notification is sent for approval.
- Creator follows are LIVE-specific relationships, not a general social-follow graph.
- Current automated backend tests assert route and SQL contracts. They are not substitutes for running the SQL migration against staging PostgreSQL and exercising concurrent joins/ends against a real database.
- Do not apply the migration to production or deploy the backend until the staging checks and release approvals are complete.
