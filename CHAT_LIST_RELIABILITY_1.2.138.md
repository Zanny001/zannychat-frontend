# ZannyChat 1.2.138 — Chat list reliability and empty states

## Changes
- Added explicit initial-loading and load-error state for the Chats list, preventing a network failure from looking like an empty account.
- Added an accessible retry action and an alert-role error message when conversation loading fails.
- Added a search-no-results state with a one-tap clear-search action.
- Improved first-run and filter-empty states with clearer guidance and a direct Start a chat action.
- Refresh state is always released after success or failure; failed refreshes retain an actionable inline error.

## Validation
- Frontend unit tests include regression checks for the chat list loading/error/search-empty/first-run contracts.
- Release hygiene audit and ZIP integrity checks run for this source bundle.

## Release notes
This is a source-only update. Production deployment, full Expo build, and Android/iOS device testing remain separate release gates.
