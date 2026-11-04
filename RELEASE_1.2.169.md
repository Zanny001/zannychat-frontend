# ZannyChat 1.2.169

## Focus
Retry-After parser correctness and transient HTTP status classification.

## Changes
- More robust handling of response header representations.
- Strict non-negative integer parsing for Retry-After delta-seconds.
- Explicit zero-delay cap support and bounded maximum wait.
- Invalid clock/header inputs fail safely.
- Only valid HTTP 5xx statuses are classified as server-transient.

## Validation
Automated tests and release audit results are recorded in the delivery summary. Production build, full backend integration, device testing and deployment are not claimed by this source package.
