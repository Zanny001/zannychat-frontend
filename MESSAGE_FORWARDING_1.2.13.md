# Text-message forwarding — release 1.2.13

Long-press a non-deleted text message and select **Forward** to choose another active conversation. The screen sends the text through the existing `sendMessage` path and excludes the source conversation. It does not forward media in this release: private media objects are conversation-scoped, so safe forwarding must copy or re-authorize the media server-side rather than reusing a private URL.

Live multi-account forwarding and navigation should be exercised in an Expo build before production.
