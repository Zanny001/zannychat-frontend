# Media save content validation — 1.2.133

- Preserves supported image/video extensions from the media URL path, including PNG, WebP, GIF, HEIC/HEIF, MOV, M4V, and WebM; signed query parameters do not affect extension detection.
- Validates a returned HTTP content type when supplied, rejecting HTML/JSON error pages that a CDN or expired signed link might otherwise deliver as a supposed media download.
- Keeps status-code checks, permission checks, temporary-file cleanup, and the existing supported-media policy.
- Content-type checking is defense in depth; it does not replace authenticated media URLs or Supabase Storage authorization policies.
