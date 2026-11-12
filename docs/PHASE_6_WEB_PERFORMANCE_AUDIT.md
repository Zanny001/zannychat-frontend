# Phase 6 — Production web and service performance snapshot

Audit window: 2026-11-11 to 2026-11-12 (Netlify's available 24-hour window)  
Scope: read-only platform telemetry. No deploy, traffic change, or paid service was initiated for this audit.

## Netlify production site

- Site: `zannychat-app`
- Current published deploy at inspection: `6af473d59d0eca8c24c26a5c` — state `ready`.
- Observed edge status counts: 541 × 304, 191 × 200, 6 × 206, 3 × 301, 2 × 404.
- No 5xx status group appeared in the returned 24-hour status-code ranking.
- The two 404s were requests to `/robots.txt` on an obsolete versioned preview hostname, not the current production hostname.
- Across 200 responses, observed edge response duration percentiles were approximately p50 113 ms, p90 744 ms, and p99 3.17 s.
- The most-requested web JS bundle URL had 9 requests and about 6.95 MB aggregate bandwidth; its p90 edge duration was about 6.97 s. A second bundle URL had 8 requests and about 4.96 MB aggregate bandwidth, with p90 about 2.10 s.

These are low-volume edge observations, not a Lighthouse score, Core Web Vitals measurement, browser LCP, or representative load test. Bundle request durations can include network/client effects; use a repeatable browser/device test before changing bundling or caching.

## Render backend

- Service: `zannychat-backend-1`, Free plan, one configured instance.
- Recent CPU samples were very low (roughly 0.001 CPU units in the returned samples).
- Recent memory samples were approximately 95–112 MiB.
- Render returned no HTTP request-count or HTTP-latency series for this service in the sampled interval, so API throughput and p95/p99 API latency cannot be asserted from this snapshot.
- No 5xx request logs were returned for the sampled 24-hour window.
- Application error logs did contain three Anthropic provider errors reporting exhausted credits. Phase 6 maps that specific quota condition to a safe HTTP 503 response instead of surfacing a generic 500 or raw provider billing details. No paid credits or provider were added.

## Interpretation and next measurements

- Production web edge is serving the site; no current production-host 404 or 5xx was found in this sample.
- Obsolete preview-host `robots.txt` requests account for the two 404s; no redirect or production routing change is justified from this evidence.
- The web JS bundle's small sample includes slow edge-duration outliers. Before changing code-splitting, fonts, or cache policy, collect repeatable cold/warm browser traces on a low-end Android device and a constrained mobile connection.
- Render telemetry does not provide sufficient HTTP samples for API latency conclusions. Use the health endpoints and capture authenticated staging request timings under a controlled test.
- Keep all monitoring within existing free platform allowances; do not add paid observability services or scale plans without explicit approval.
