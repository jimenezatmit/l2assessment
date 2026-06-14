# Week 2 Baseline Assessment

## Testing Approach

I tested messages representing production outages, billing failures, technical
problems, feature requests, general questions, and positive feedback. I compared
the displayed category, urgency, and recommendation with the action a support
team would reasonably take.

## Top Three Areas for Improvement

### 1. Urgency does not reflect customer impact

The original scorer used message length, punctuation, politeness, and the local
time. This marked short outage reports such as "Server down now" as Low while
allowing exclamation marks to increase the urgency of positive feedback.

**Proposed solution:** score operational impact and risk instead. Outages,
security incidents, loss of access, failed payments, and broadly affected users
should take priority over writing style.

### 2. Category recommendations can route customers incorrectly

The Feature Request category recommends checking the billing portal. Other
recommendations are also generic and do not account for urgency.

**Proposed solution:** give each category an appropriate destination and use
urgency to decide whether to escalate. For example, feature requests should go
to product feedback, while high-urgency technical issues should page support or
engineering.

### 3. LLM classification is inconsistent and difficult to validate

The app asks the model for free-form text and then searches that prose for words
such as "billing" or "bug." Hybrid messages can produce inconsistent categories,
and an API failure silently switches to different rule-based behavior.

**Proposed solution:** require a structured JSON response with an allowed
category, confidence score, and short reason. Validate the response and send
low-confidence or multi-intent messages to manual review.

## Implemented Improvement

I replaced the urgency algorithm with deterministic, impact-based rules:

- High: outages, security incidents, account lockouts, failed payments, and
  issues blocking many users.
- Medium: errors, broken behavior, timeouts, and degraded performance.
- Low: feature requests, informational questions, and positive feedback.

The result no longer changes based on message length, punctuation, weekend, or
time of day.

## Before and After Examples

| Message | Before | After |
| --- | --- | --- |
| Database connection lost | Low | High |
| Server down now | Low | High |
| Dashboard is loading very slowly | Low | Medium |
| Could you add an export to CSV feature? | Low | Low |
| Thank you! Your team has been incredibly helpful! | Medium | Low |

## Verification

- Added eight automated urgency tests.
- `npm test`: 8 passed, 0 failed.
- Focused ESLint check for changed files: passed.
- `npm run build`: passed.
- The repository's full lint command has six pre-existing errors outside this
  implementation.

## Future Work

1. Return and validate structured LLM output.
2. Correct category routing templates and incorporate urgency into escalation.
3. Move the Groq API call to a backend so the API key is not exposed in the
   browser.
