# Channel post reports — frontend 1.2.74

- Added a report action to channel posts with reason selection: spam, harassment, hate, misinformation, or other.
- Users cannot report their own posts; duplicate reports are rejected by the backend.
- Channel owners and moderators can open a report review panel and mark reports reviewed or dismissed.
- Backend migration `0037_channel_post_reports.sql` is required before using this feature.

Local verification: 87 frontend unit tests passed, release audit 12/12 passed, and the channel screen JSX parse check passed. Hosted database/API and physical-device tests remain outstanding.
