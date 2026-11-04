# Status video recovery — 1.2.146

- Status video source/playback failures now surface in the same accessible recovery state as failed images.
- Failed video playback stops rendering the broken player and offers the existing fresh-URL retry path.
- Player status listener is removed when the viewer component unmounts to avoid stale event callbacks.

Validation: see release test and audit results for this package. Device playback and production build remain separate release gates.
