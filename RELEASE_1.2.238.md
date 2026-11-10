# ZannyChat frontend 1.2.238

- Retains the 1.2.237 explicit messages foreign-key embed and outgoing call setup race fixes.
- Adds “Delete for me” and sender-only “Delete for everyone” through the authenticated `delete_message` RPC.
- Uses high-contrast dark foreground text on pale outgoing bubbles in light mode; preserves white foregrounds in dark mode.
- Adds regression coverage for deletion migration contracts and bubble contrast.
- Requires backend migration 0065 before enabling deletion controls against Supabase.
