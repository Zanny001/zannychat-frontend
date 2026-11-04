# ZannyChat 1.2.161

This release hardens outgoing-message retry recovery against device clock changes. Future-dated retry timestamps no longer block queued messages until the local clock catches up. The existing bounded exponential backoff and retry-attempt cap remain in place.

Validation performed for this source package: frontend unit tests, frontend release audit, and ZIP integrity check. Production build, device tests, live backend integration, and deployment are not claimed by this release.
