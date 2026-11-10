# ZannyChat Frontend 1.2.239 — Release Validation Record

## Release identity

- Frontend package and Expo app version: 1.2.239
- Expo SDK: 57.0.31
- Backend package version: 1.2.239
- Frontend source: `/root/zannychat-front`
- Backend Git repository: `/root/zannychat-back-github`
- Release status: **NOT APPROVED FOR PRODUCTION DEPLOYMENT**

## Recorded automated checks

| Check | Result | Qualification |
|---|---:|---|
| Frontend release source audit | 22/22 passed | Static/source audit only |
| Frontend release contract | 4/4 passed | Checks package, Expo and lockfile consistency plus backend version |
| Frontend release readiness | 29/30 passed | Native WebRTC validation remains blocked |
| Frontend unit suite | 442 passed, 0 failed | Previously reported source test run; rerun before release |
| Call recovery contract tests | 2/2 passed | Static source contract tests, not real WebRTC connectivity tests |
| Backend automated tests | 327 passed | Reported in backend deployment notes; source tests only |

The release contract and readiness scripts now explicitly inspect `/root/zannychat-back-github`, the backend Git repository, rather than the separate non-Git `/root/zannychat-back` directory.

## Outstanding blockers

1. **Native WebRTC compatibility:** clean Android and iOS builds and real-device outgoing/incoming call tests have not been evidenced. See `WEBRTC_SDK57_NATIVE_VALIDATION.md`.
2. **Call deployment and background limitations:** documented separately in `AUDIO_VIDEO_CALLS_1.2.239.md`; documentation does not substitute for platform testing.
3. **Canonical release metadata:** updated to identify frontend 1.2.239 and backend 1.2.239.
4. **Validation record:** this document records the current test and release-gate results.

Native WebRTC validation remains the outstanding release blocker. The readiness script is expected to report fewer than 30 passing gates until native validation is actually completed and recorded.

## Build and deployment status

- The existing frontend `dist/` directory predates the current 1.2.239 source changes and is not a verified release artifact.
- A production Netlify `--no-build` deployment using that directory is unsafe and must not be performed.
- No fresh web export is certified by this record.
- No new Android or iOS binary build is certified by this record.
- No Render or Netlify production deployment is claimed.
- No production Supabase migration or background worker execution is claimed or authorized here.
- Production authentication, media, messaging and two-device call smoke tests remain outstanding.

## Release decision

**HOLD. Do not deploy this release until all readiness gates pass, the native build/device evidence is recorded, and the resulting web artifact is verified to match the reviewed source.**

This record describes observed development-session checks. It is not a claim that production has been updated.
