# ZannyChat frontend 1.2.202

- Added multi-select poll creation and voting controls.
- Poll results now distinguish unique voters from total option selections.
- Aggregate results expose only the signed-in user's own option selections, not voter identities.
- Requires backend migration `0053_multi_select_polls.sql` and backend release 1.2.51.
