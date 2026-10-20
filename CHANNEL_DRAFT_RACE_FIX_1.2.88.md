# Frontend v1.2.88 — channel draft save/clear ordering

Serialized channel-post draft writes and clears per storage key. This prevents an autosave that started before a successful publish from finishing after draft removal and restoring the already-published text. A failed prior write does not block a later clear. Storage remains local to the device and per account/channel; this is not cloud synchronization or a guarantee against device loss.

Validation: unit tests cover delayed-write/clear ordering, failed writes followed by cleanup, and invalid storage requests. Full release checks and archive integrity are recorded in the release delivery. Hosted and physical-device testing remain outstanding.
