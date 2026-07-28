# Triage engine: what was wrong, what changed, and what it's worth

This document summarizes the defects found in the original triage engine,
the fixes applied, and honest limitations of the result. It's written
against one commercial claim: this product is sold to small support teams
on the promise that they can handle more volume without hiring. Every
defect below is judged against whether it helps or undermines that claim.

## Before / after

| Metric | Baseline (broken scorer) | After fixes |
|---|---|---|
| Overall accuracy (32-message golden set) | 12/32 (**37.5%**) | 32/32 (**100%**) |
| Critical recall (true-High messages caught as High) | 0/16 (**0%**) | 16/16 (**100%**) |

Critical recall is the headline number, not accuracy. See
[README.md](README.md#evaluating-the-triage-engine) for why.

At baseline, **every single true emergency in the golden set was scored
Medium or Low** - terse outage reports, polite emergencies, and legal/churn
threats all failed to reach High. The only messages that scored High were
two trivial complaints written in all-caps with exclamation marks. A team
running the old scorer at full trust would have missed 100% of its real
fires and paged on-call for a customer complaining about button color.

## Areas for improvement, in priority order

### 1. `calculateUrgency` was not a pure function, and scored style instead of content

```js
const now = new Date()
if (now.getDay() === 0 || now.getDay() === 6) {
  urgencyScore -= 20
}
if (now.getHours() < 9 || now.getHours() > 17) {
  urgencyScore -= 15
}
```

```js
const exclamationCount = (message.match(/!/g) || []).length
urgencyScore += exclamationCount * 30
if (message.length < 50) urgencyScore -= 40
if (message.length < 20) urgencyScore -= 60
```

**Why it matters commercially:** this is the core of the product's value
claim. If the same message can score differently depending on the day of
week or hour it happens to be analyzed, the queue is unauditable - a
support lead investigating why a ticket sat for hours can't even reproduce
the original score. And the scoring itself tracked typography (exclamation
marks, ALL CAPS, message length, politeness) instead of business risk, so
a terse "Database connection lost." was penalized to Low while a message
with several exclamation points about a trivial issue could reach High. A
team can't "handle more volume without hiring" if the automation is both
non-reproducible and inversely correlated with real severity - they end up
re-reading the whole queue by hand, which is the exact labor the product
promises to remove.

**Fix:** rewrote `calculateUrgency`/`scoreUrgency` around 13 weighted
business-risk categories (security exposure, data loss, outage, production
impact, blocked users, legal threat, churn, payment failure, blast radius,
repeat contact, plain defect, degraded performance, explicit urgency). No
`Date`, no randomness - same input always produces the same output. Tone
(caps/punctuation) is capped as a small amplifier and can never be a
primary driver. Praise with no reported problem is capped so it can never
outrank a real issue, but only when no problem signal fired, so "thank you
for your help, but production is down" is still scored as an outage.
Returns `{ level, score, signals }` so a support lead can see exactly
which phrases produced a given priority - now rendered in the UI.

### 2. LLM failures were silently swapped for keyword matching, rendered identically to real AI output

```js
} catch (error) {
  console.warn('Groq API failed, using mock response:', error.message);
  return getMockCategorization(message);
}
```

**Why it matters commercially:** this is a trust failure for a product
sold specifically on AI-powered triage. Nothing distinguished a real model
response from the keyword-matching fallback - not in the return value, not
in the UI, not in any log a customer could see. Failures get *more* likely
exactly as a customer's volume grows (rate limits, transient errors) -
i.e., precisely the growth scenario this product is sold for. A team could
run on the degraded fallback for hours with zero indication, silently
trusting output that was never reviewed by a model at all.

**Fix:** the fallback now returns `source: 'fallback'` and `degraded:
true`, confidence capped at 0.2 (below the escalation threshold, so a
degraded result always routes to a human), and states in its own
reasoning text that it's a fallback guess. `AnalyzePage` shows an explicit
amber banner and relabels the reasoning panel "Fallback Reasoning (AI
unavailable)" instead of "AI Reasoning" - a fallback result can no longer
look identical to a real one.

### 3. The category was parsed by substring-matching the model's free text

```js
messages: [{ role: "user", content: `Categorize this customer support message: ${message}` }],
temperature: 0.7,
...
if (content.toLowerCase().includes('billing')) {
  category = "Billing Issue";
} else if (content.toLowerCase().includes('technical') || content.toLowerCase().includes('bug')) {
```

**Why it matters commercially:** the prompt never told the model the
category taxonomy, and the parser checked keywords in a fixed order with
no negation handling. "This is not a billing issue, it's technical" would
match "billing" first and misfile the ticket - silently, with no error and
no way to detect the pattern without manually re-reading every response.
At `temperature: 0.7` the same message could also categorize differently
on different runs, compounding the audit problem from defect #1.

**Fix:** system prompt states the taxonomy explicitly and requires a
single JSON object via `response_format: { type: 'json_object' }` at
`temperature: 0`. The response is schema-validated (category must be one
of five taxonomy values, confidence a number in [0,1], reasoning a
non-empty string) with a bounded retry (up to 3 attempts, 8s timeout each)
that only retries transient failures - a bad/malformed response fails fast
into the fallback rather than burning retries on something retrying won't
fix.

### 4. Routing was a single hardcoded string per category, ignoring urgency entirely - and the one real safety net was dead code

```js
const actionTemplates = {
  "Billing Issue": "Ask user to check billing portal.",
  "Technical Problem": "Suggest user to restart their browser.",
  "General Inquiry": "Respond with FAQ link.",
  "Feature Request": "Ask user to check billing portal.",
  ...
}
export function getRecommendedAction(category, urgency) {
  return actionTemplates[category] || "No recommendation available."
}
export function shouldEscalate(category, urgency, message) {
  return message.length > 100
}
```

**Why it matters commercially:** a customer requesting dark mode got
routed to the billing portal (copy-paste bug: Feature Request reused the
Billing Issue string verbatim). `getRecommendedAction` accepted `urgency`
as a parameter and never read it, so a P1 outage and a Low-priority defect
in the same category got identical advice. `shouldEscalate` ignored
category and urgency entirely and escalated purely on `message.length >
100` - a two-word outage report was never escalated, while a long polite
thank-you note was.

**Worse: `shouldEscalate` and `getAvailableCategories` were exported but
never imported anywhere in the application.** Escalation logic had never
actually run in this product, at any point - not "it runs but is buggy,"
but literally dead code with zero callers. Fixing the function's logic
alone would have produced better-tested dead code; it had to be wired into
`AnalyzePage`'s analysis flow to do anything at all.

**Fix:** `getRecommendedAction(category, urgency)` now routes on the
(category × urgency) pair to a named owning team, a P1-P4 priority, and an
SLA. `shouldEscalate({ category, urgency, urgencySignals, confidence,
degraded })` checks real signals - urgency scored High, a security or
legal-threat signal, churn language, low classifier confidence (<50%), or
degraded AI mode - and returns `{ escalate, reasons }` so the decision is
auditable. It's now called from `AnalyzePage`'s analysis flow and its
result is rendered as a distinct panel with the specific reasons.

### 5. The UI had no visibility into any of the above

Even before the routing bugs, `AnalyzePage` called
`getRecommendedAction(category)` with urgency dropped, never called
`shouldEscalate`, and gave a support agent no way to distinguish a real AI
response from a silently-degraded one. Fixing the underlying functions
wasn't sufficient on its own - none of it reached the person actually
triaging tickets. `AnalyzePage` now surfaces the routing decision
(team/priority/SLA), the urgency score and the specific signals that
produced it, classifier confidence (visibly flagged below 60%), the
degraded-mode banner, and escalation reasons when triggered.

## If forced to pick one improvement

**Fix #1, the urgency scorer.** Here's the business reasoning: a support
lead who doesn't trust the priority label doesn't skip triage - they
re-read the entire queue by hand to find what the system missed. That's
true regardless of how good categorization, routing, or the LLM fallback
are, because urgency is the field that determines whether a ticket gets
looked at *today*. A wrong category costs a misrouted ticket; a wrong
"Low" on an outage costs the outage. And because the old scorer was
non-deterministic and non-reproducible (it read the wall clock), a lead
couldn't even trust it consistently within a single day, let alone across
a growing team. Every other fix in this list only pays off if the urgency
label underneath it is trustworthy - fixing routing or the LLM on top of a
broken urgency signal just means the *wrong* tickets get well-routed
faster. This is the one defect that, left unfixed, inverts the product's
entire value claim: instead of handling more volume without hiring, a team
running the old scorer would need to review every ticket manually anyway,
which is strictly worse than having no automation, since it adds a false
sense of security on top of the manual work.

## What the eval harness caught in my own rewrites

This is the strongest evidence the harness was worth building: it caught
real bugs in code I wrote *while building the fix*, not just in the
original app.

1. **Smart-quote normalization.** The first post-rewrite eval run failed
   `defect-1` ("The export button doesn't work...") with zero signals
   fired. The golden-set message used a curly apostrophe (`doesn't` with
   U+2019); every apostrophe-sensitive pattern (`doesn'?t work`) only
   matched a straight ASCII apostrophe. This isn't a golden-set quirk -
   customer messages pasted from Word, email, or Notes are full of smart
   quotes, so this would have silently failed to detect defects in real
   inbound tickets. Fixed by normalizing curly quotes before matching, not
   by special-casing the one failing message.

2. **The `ing?` regex bug.** While wiring `shouldEscalate`'s churn-risk
   reason in the routing fix, a manual smoke test against a message
   containing "cancel our contract" (not "cancelling") produced no churn
   signal at all, despite the golden-set eval showing 100% pass. The
   pattern was `cancel(l)?ing?` - the `?` only makes the trailing `g`
   optional, not "ing" as a whole, so it required a literal "in" right
   after "cancel(l)?" and only matched gerund phrasing ("cancelling",
   "canceling") by coincidence. The golden set didn't catch this because
   its churn examples happened to use gerund phrasing or the separate
   `"cancel my account"` literal pattern - a reminder that 100% on a fixed
   set doesn't mean a rule has no blind spots outside it. Fixed with
   `cancel\w* (my|our) (account|subscription|contract)`.

3. **Groq client constructed at module load time.** Functional testing of
   the LLM fallback (deliberately run with no API key configured, since
   this repo doesn't have one) found that `categorizeMessage` never even
   ran - the module crashed on import, because `new Groq({ apiKey:
   undefined })` throws synchronously, and the client was constructed as a
   top-level `const` at import time, outside any try/catch. A missing or
   invalid key would have crashed the entire module before the new
   fallback logic could run at all, defeating the whole point of the fix.
   Fixed by constructing the client lazily on first use, inside the
   retry/fallback path, so a missing key is just another non-retryable
   error that degrades gracefully like any other configuration problem.

None of these three were caught by "does the golden set pass" - they were
caught by deliberately probing the code with inputs the golden set didn't
happen to cover (curly quotes, plain-tense phrasing, a missing API key).
The golden set measures urgency scoring; it doesn't and can't validate
routing or LLM-handling code by itself.

## Limitations, stated honestly

- **100% on a 32-case set I designed and tuned against overstates
  real-world accuracy.** I wrote the golden set, then iterated the scorer
  against it - that's the intended workflow for building the rules, but it
  means this number is an upper bound, not a production estimate. The next
  step is a held-out set built from real (anonymized) inbox messages that
  I did not look at while writing the scoring rules. Expect accuracy in
  the 80s once it meets phrasing nobody anticipated.
- **The scorer is rules-based: English-only, and blind to phrasing it
  wasn't written for.** It pattern-matches known phrasings of known risk
  categories. A message describing the same outage in a way that doesn't
  hit any pattern (or in a language other than English) will score however
  the *absence* of signals resolves - typically Low, which is the
  dangerous failure mode for this specific job. Long-term, the right
  architecture likely has the LLM assess business impact directly (it
  generalizes to phrasing a fixed rule set can't), with the rule-based
  signals kept as a floor specifically for the unmissable categories -
  breach, outage, data loss - that must never depend on a model call
  succeeding.
- **Category accuracy isn't measured at all.** The golden set only labels
  urgency. `categorizeMessage`'s category output (Billing Issue/Technical
  Problem/Feature Request/General Inquiry/Unknown) has no equivalent
  golden set or eval gate - the structured-output and schema-validation
  changes in this round are architecturally sound but unverified against
  labelled examples. That's the natural next harness to build.
- **The Groq API key is still exposed in the browser.**
  `dangerouslyAllowBrowser: true` is doing exactly what it says - this is
  fine for a local assessment build but is not production-safe. It needs a
  backend proxy that holds the key server-side before this ships to real
  customer data.
- **Agent corrections are discarded.** If a support agent overrides the
  system's category or urgency, that correction isn't captured anywhere -
  not in `triageHistory`, not as training/eval data. That's a missed
  source of exactly the labelled, real-world examples the first
  limitation above says are needed, and it means the system can't improve
  from its own mistakes without separate manual effort.
