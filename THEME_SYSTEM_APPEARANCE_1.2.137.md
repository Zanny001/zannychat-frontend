# System Appearance & Status Bar — 1.2.137

## What changed
- Expo's native `userInterfaceStyle` is now `automatic`, allowing the OS color scheme to be observed when the app appearance preference is set to System.
- Status-bar icon style now follows the resolved app theme: dark icons in light mode and light icons in dark mode. Explicit Light/Dark settings therefore remain readable instead of always forcing white status-bar icons.
- Added focused regression tests for status-bar style resolution.

## Validation
- Run `npm run test:unit` and `npm run audit:release`.
- Native rebuild and physical-device checks are required to confirm OS appearance propagation on Android/iOS. Web browser theme behavior should also be smoke-tested.

## Release status
Source-only change. No production deployment or live Supabase mutation performed.
