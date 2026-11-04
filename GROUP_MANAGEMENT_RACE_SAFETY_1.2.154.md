# Group Management Race Safety — 1.2.154

## Changes
- Protect group member, current-user, metadata, and invite refreshes with a request generation token.
- Ignore stale responses after a newer refresh starts or the screen loses focus.
- Validate invite-list response shape before applying it to the screen.
- Keep loading and error states tied to the current request only.

## Validation
- Automated frontend utility tests and release audit are run for this source package.
- Backend authorization, full production build, and physical-device integration remain separate release gates.
