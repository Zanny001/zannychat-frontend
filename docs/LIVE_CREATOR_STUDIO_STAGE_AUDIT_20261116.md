# ZannyChat LIVE Creator Studio and stage hierarchy

## Scope

This increment is stacked on the LIVE media reliability branch so role labels and the creator tools build on server-issued creator/guest/viewer identity rather than route parameters.

## Delivered in this increment

- Creator and guest video tiles carry explicit HOST / GUEST role chips on native and web clients. The creator identity comes from the joined stream's creator ID, not a client-supplied display mode.
- The stage manager is presented as Creator Studio, with measured counts from the existing authenticated participants response:
  - currently joined viewers;
  - currently joined guest publishers on stage, against the existing five-guest limit;
  - remaining guest slots.
- Existing invite, microphone mute, spotlight, removal and moderator actions remain in place.
- Native and web surfaces share the same Studio summary language and role hierarchy.
- Contract tests protect the role labels and ensure the Studio metrics use joined participant rows rather than estimated audience/watch-time values.

## Data integrity

The existing `GET /live/:streamId/participants` endpoint is creator-only and returns joined viewer/guest roles, joined state and moderator membership. The new metrics are derived only from those rows. They are explicitly labelled as current connected participants; they are not lifetime reach, unique viewers, watch time, retention, or earnings.

## Not included

- No schema changes, RLS changes, new permissions or new API routes.
- No fake analytics, scheduled events, PK battles, gifts, wallet, cash-out or monetization.
- No change to LiveKit media authorization or stream admission.
- No claim that CI proves real audio/video delivery.

## Acceptance gates

1. Run the frontend LIVE quality and advanced native client workflows.
2. Verify a creator sees HOST and approved guests see GUEST in both native and web stages.
3. Verify viewers cannot see Creator Studio or creator controls.
4. Verify counts update after participant refresh and never exceed the server-enforced guest capacity.
5. Test at narrow mobile widths, large text and screen-reader navigation.
6. Retain two-account browser and two-physical-device media tests from PR #86 as a production release gate.
