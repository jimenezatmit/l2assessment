# Baseline: rule-based urgency scorer vs. golden set

Recorded baseline run of `npm run eval` against the golden set, before any
fixes to `src/utils/urgencyScorer.js`. Kept as a checked-in reference point
so improvements can be measured against a fixed snapshot rather than
re-running (`calculateUrgency` is not a pure function of its input - it
also reads `new Date()` - so re-running this script at a different day/hour
can shift individual results even with no code changes; see runEval.js for
notes and treat any new run as the source of truth over this file).

Run at: Mon Jul 27 2026 20:06:48 GMT-0400 (Eastern Daylight Time)
Golden set size: 32

## Headline metrics

- Overall accuracy: 12/32 (37.5%) — gate threshold 75%, **FAIL**
- Critical recall (true-High caught as High): 0/16 (0.0%) — gate threshold 90%, **FAIL**

Every single true-High message in the golden set was scored Medium or Low.
Zero critical messages were caught.

## Confusion matrix (rows = expected, columns = predicted)

| expected \ actual | High | Medium | Low |
|---|---|---|---|
| High   | 0 | 11 | 5 |
| Medium | 0 | 5  | 0 |
| Low    | 2 | 2  | 7 |

## Failures (20/32)

| id | tag | expected | actual |
|---|---|---|---|
| terse-1 | terse-critical | High | Low |
| terse-2 | terse-critical | High | Low |
| terse-3 | terse-critical | High | Medium |
| terse-4 | terse-critical | High | Medium |
| terse-5 | terse-critical | High | Medium |
| polite-1 | polite-emergency | High | Low |
| polite-2 | polite-emergency | High | Medium |
| polite-3 | polite-emergency | High | Low |
| polite-4 | polite-emergency | High | Low |
| threat-1 | churn-legal | High | Medium |
| threat-2 | churn-legal | High | Medium |
| threat-3 | churn-legal | High | Medium |
| threat-4 | churn-legal | High | Medium |
| feature-4 | feature-request | Low | Medium |
| praise-1 | praise | Low | Medium |
| adversarial-1 | adversarial | Low | High |
| adversarial-2 | adversarial | Low | High |
| adversarial-3 | adversarial | High | Medium |
| adversarial-4 | adversarial | High | Medium |
| adversarial-5 | adversarial | High | Medium |

Reproduce with `npm run eval` (or `node src/evals/runEval.js`).
