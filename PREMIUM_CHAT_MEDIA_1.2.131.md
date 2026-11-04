# ZannyChat 1.2.131 — Premium contact profiles and media experience

## Delivered in source
- Private-chat title and avatar open a dedicated contact profile screen with avatar, availability/last-seen when supplied, About text, and only the contact details present in the app's participant object.
- Media selection opens a pre-send review screen. Photos support crop in the system picker; photos and videos can receive a caption and quick emoji additions before sending.
- Videos render inline in chat using `expo-video` native controls rather than requiring an external browser page.
- Chat images, chat videos, and image/video Status items expose save-to-device actions using `expo-media-library`.
- Video attachments are supported by the bounded local attachment retry queue.
- `expo-media-library` was added to `package.json` and configured with photo-library permission copy in `app.json`.

## Validation
- Frontend unit tests: 220 passed, 0 failed.
- Frontend release audit: 12/12 passed.
- JSX parsing: all modified React Native screens/components parsed successfully.
- JSON configuration validation: `package.json` and `app.json` valid.

## Important installation and release notes
- This is a source-only upgrade; no production Netlify, Render, or Supabase deployment was performed.
- The environment could not reach the npm registry, so the npm lockfile could not be regenerated for the new `expo-media-library` dependency. In a networked development environment, run `npx expo install expo-media-library` and commit the resulting lockfile before building/releasing.
- A native rebuild is required after installing a native Expo module. Verify Android/iOS permission prompts and saving on physical devices.
- The image picker provides system cropping and a caption/emoji editor. Advanced freehand drawing, stickers, video trimming/transcoding, and media metadata removal are not implemented in this pass.
- Only participant fields available to the client are shown in the profile. Phone/email/username details are not fetched from private sources or invented when absent.
