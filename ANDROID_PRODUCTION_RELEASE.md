# Android production build

The production build is intentionally manual and does not submit anything to Google Play.

## Required GitHub Actions secrets

Configure these in the frontend repository's **Settings → Secrets and variables → Actions**:

- `EXPO_TOKEN`: an Expo access token with permission to build the ZannyChat EAS project.
- `GOOGLE_SERVICES_JSON_BASE64`: the Base64-encoded production Firebase `google-services.json` for Android package `com.zannychat.app`.

Do not commit `google-services.json`, paste it into chat, or print either secret in CI logs. The workflow decodes the file only inside the ephemeral GitHub runner, validates its project ID and Android package, and then passes it to the EAS build.

For Linux or Termux, create the secret value locally with:

```sh
base64 -w 0 google-services.json
```

Copy the output directly into the GitHub secret value. Keep the original file private.

## Build

After both secrets exist, open **Actions → Android production build → Run workflow** on the release branch and enable the confirmation checkbox.

The workflow installs locked dependencies, rejects missing or placeholder Firebase configuration, checks the package/version code, and starts a signed production Android App Bundle build using the pinned EAS CLI. It does not submit the build to Google Play.

**Cost gate:** EAS production builds may consume paid build quota. The workflow is manual and requires the confirmation checkbox; do not run it under the current ₦0 budget without explicit budget approval.

EAS Android push delivery also requires valid Firebase Cloud Messaging credentials to be configured for this EAS project. The presence of `google-services.json` alone does not prove that FCM credentials are configured.

## Release gates still required

A successful cloud build is not proof of correct runtime behavior. Before publishing:
- Install the matching production-configured QA build on a physical Android 10 device.
- Verify cold launch, warm launch, sign-in/session restoration, notifications, incoming/outgoing calls, audio/video, and background/terminated call handling.
- Inspect Android logcat if startup does not reach the app.
- Verify the Google Play listing, signing, privacy disclosures, and release track separately.
