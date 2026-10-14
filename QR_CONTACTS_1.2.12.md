# QR contact discovery — release 1.2.12

New Chat → Connect by QR opens a screen that displays the signed-in user's profile UUID as a QR code and can scan another ZannyChat contact code. The scanner validates the `zannychat://contact/<uuid>` scheme and UUID format, resolves the profile through Supabase, rejects the user's own code, and starts a conversation through the backend. It requires both Supabase and the backend to be configured; mock mode does not pretend a QR contact is real. Camera permission is requested only when the scanner is started.

Dependencies added: `expo-camera` and `react-native-qrcode-svg` (with existing `react-native-svg`). A native build must install the Expo-compatible package versions. Live two-account scanning, RLS profile lookup, backend conversation creation, and physical-device camera permission behavior remain to be verified against a non-production Supabase environment.
