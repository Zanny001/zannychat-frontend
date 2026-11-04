# ZannyChat frontend 1.2.180

## Reliability improvement

Status story navigation now checks expiry at the moment navigation is requested. Expired and malformed rows are skipped, including during owner-specific chronological navigation and global-feed fallback. This complements the periodic and foreground expiry pruning introduced in 1.2.179.

## Validation

Unit tests and release audit are run for this source package. This is not a production deployment; full device, production build, live service, and backend integration validation remain separate release gates.
