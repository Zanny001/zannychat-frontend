# ZannyChat 1.2.127 — fail-closed Status privacy metadata

## Change
The Status feed now stops and returns a safe, user-facing error if the selected-audience recipient lookup, muted-contact lookup, or excluded-contact lookup fails. Previously, a failed lookup could leave an empty in-memory set and cause the client-side privacy filter to behave as if no selected recipients, mutes, or exclusions existed.

## Security boundary
This is defense in depth only. Supabase Row Level Security must enforce status visibility server-side. Client-side filtering is not an authorization boundary and does not replace two-account RLS tests.

## Validation
Added unit tests for successful metadata reads and failure of each privacy lookup. Production RLS, live Supabase behavior, and physical-device status feed behavior still require integration testing.
