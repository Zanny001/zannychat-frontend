# ZannyChat release 1.2.194

## Improvement
Poll results now display percentage bars alongside each option's vote count. Percentages are calculated with a small pure utility that handles empty totals and malformed/unsafe counts safely; option rows expose an accessible label containing the count and percentage. This makes poll outcomes easier to scan while retaining the existing single-choice vote flow.

## Changed files
- Frontend: `src/screens/PollsScreen.js`, `src/utils/pollResults.js`, `src/utils/pollResults.test.js`
- Version manifests updated to 1.2.194.

## Verification and deployment
Run frontend unit tests and the release audit before packaging. This source update has not been deployed to production; verify the result display on Android/iOS and web as applicable.
