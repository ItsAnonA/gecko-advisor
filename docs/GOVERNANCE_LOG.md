# Governance Log

Tracks threshold changes, tolerance expansions, and reviewable operational decisions.
Each entry is a time-bounded decision that must be reviewed by its review date.

---

## 2026-02-19 — Temporary Tolerance Expansion

**Decision**: Expand circuit breaker and timeout thresholds to reduce false positives.

| Parameter | Old Value | New Value |
|-----------|-----------|-----------|
| Circuit breaker errorRate | 5% | 20% |
| Circuit breaker queueDepth | 100 | 200 |
| Circuit breaker avgDuration | 45s | 60s |
| Request timeout | 5s | 15s |
| Job timeout | 60s | 90s |
| Min sample size (new) | N/A | 10 scans |
| P95 soft alert (new) | N/A | 45s |

**Rationale**: Error rate at 30% was caused by unrealistic timeouts (5s request, 10s crawl budget) and unclassified HTTP errors (403s counted as success). Previous 5% circuit breaker threshold caused permanent triggering during normal web crawling operations.

**New safeguards added**:
- Error-weighted scan confidence (Laplace-smoothed beta mean) gates stability labels
- P50/P90/P95 latency percentile tracking with P95 soft alert
- Minimum sample size (10) prevents false positives during low-volume periods
- Classified error codes: TIMEOUT, DNS_FAILURE, CONNECTION_REFUSED, SSL_ERROR, BLOCKED, RATE_LIMITED, SERVER_ERROR, SITE_UNREACHABLE

**Review trigger**: When 7-day rolling error rate drops below 10%, lower errorRate threshold to 15%.

**Review date**: 2026-03-05

**Owner**: Engineering

**Related commits**:
- `477d0f0` — Circuit breaker threshold recalibration
- `f477b5f` — Scanner error classification + timeout tuning
- Stabilization sprint (this batch) — Confidence scoring + latency percentiles
