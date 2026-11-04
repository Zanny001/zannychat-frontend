# ZannyChat frontend 1.2.179

- Prune expired status items immediately on Status screen mount.
- Re-check status expiry when the app returns to the foreground, covering timer throttling during backgrounding.
- Clean up the foreground listener and periodic timer on unmount.
- Added regression coverage for the foreground lifecycle wiring.

This is a source release. Production build, live deployment, and real-device lifecycle testing have not been performed as part of this pass.
