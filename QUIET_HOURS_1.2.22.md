# Quiet hours — 1.2.22

The Notifications screen now supports an opt-in local-time quiet-hours window. The window is validated as 24-hour `HH:MM` values and supports intervals that cross midnight. Invalid/equal boundaries fail open instead of silently muting notifications indefinitely.

**Scope limitation:** this setting is applied by Expo's foreground notification handler. It suppresses banners and sounds only while ZannyChat is open. It does not suppress OS-rendered background push notifications, change server delivery, or replace per-conversation mute. Those behaviors require platform/server configuration and are explicitly disclosed in the UI.

Defaults are disabled, 22:00–08:00. Preferences are stored in the existing on-device notification preferences.
