# Customer Inbox Triage — Improvements

A review of the triage tool against Relay AI's goal (let small teams handle more volume
without adding headcount), the top 3 issues found, and the improvement implemented.

## How I tested

- Ran every message in `sample-messages.json` plus new examples through the actual triage
  modules (deterministic harness — see `tests/`).
- Drove the running app in a browser (paste message → Analyze → inspect results).

## Top 3 areas for improvement

### 1. The AI categorization is brittle, non-deterministic, and crashes with no key — *the core product*

- The prompt was `"Categorize this customer support message: <msg>"` with **no system
  prompt, no category list, and no output format**, at `temperature: 0.7`. The same
  message could get different categories on re-runs.
- The category was then recovered by **substring-matching the model's free-text prose**
  (`content.includes('billing')`, checked billing-first). A reply like *"this is not
  billing, it's technical"* would mislabel as Billing; prose with none of the keywords
  fell through to "Unknown." The raw model ramble was shown to the user as "reasoning."
- **Crash:** the Groq client was constructed at module load with the API key. With no key
  the SDK **throws during construction**, before React mounts — so the **entire app
  white-screened**. The `try/catch` only wrapped the API *call*, so the "mock mode (no API
  key needed)" advertised in the README was **unreachable**.

### 2. Urgency scoring was backwards — it scored surface features, not meaning

In the harness, **7 of 10** sample messages were mislabeled. `"Server down now"`,
`"Database connection lost"`, and `"Our production server is down"` all scored **Low**,
while a cheerful `"Thank you!!!"` scored **High**. Why:

- each `!` added +30; **short** messages *subtracted* (terse emergencies looked calm);
  ALL-CAPS subtracted; questions subtracted;
- **weekends / after-hours subtracted** — a Saturday-2am outage was *deprioritized*, and
  the score depended on `new Date()`, making results non-deterministic and untestable.

For a tool whose entire value is surfacing what's urgent, this is the worst failure mode.

### 3. Routing & escalation were wrong, and there was no real "routing"

- `Feature Request → "Ask user to check billing portal"` (copy-paste bug);
  `Technical Problem → "restart your browser"` regardless of severity;
  `getRecommendedAction` ignored urgency entirely.
- `shouldEscalate` was `message.length > 100` and **was never called** — a 41-char
  *"data breach, customer info exposed"* didn't escalate, but a 123-char thank-you did.
- Nothing assigned a team/queue, although the product's pitch is to *route* messages.

## What I implemented

A **robust, structured, single-pass triage engine**. These three issues are one pipeline,
so fixing them together gives the biggest lift.

| File | Change |
|------|--------|
| `src/utils/llmHelper.js` | One Groq call with a Relay-AI **system prompt**, the category enum, an explicit **urgency rubric**, **JSON mode** (`response_format: json_object`), and `temperature: 0` → deterministic, structured output. Output is **validated** (unknown enum values → safe defaults) and enriched. **Lazy client init** + try/catch → a missing/invalid key degrades to a local heuristic instead of crashing. |
| `src/utils/urgencyScorer.js` | Rewritten to score **business impact** (outage, data/security, blocked access, churn/legal, time pressure) instead of punctuation/length/time-of-day. Exposes `hasCriticalSignal()` used as a **hard floor**. |
| `src/utils/templates.js` | Correct per-category **action + owning team**, sharpened when urgency is High (e.g. "page the on-call engineer"). `shouldEscalate` now keys off urgency + critical signal, not length. |
| `src/pages/AnalyzePage.jsx` | Consumes the single structured result; adds **input validation**, an **escalation banner**, **route-to team**, **confidence**, and a **heuristic-mode notice**. |

**Design note — why a hybrid (LLM + deterministic floor):** the LLM understands meaning
(so it fixes the urgency inversion), but a pure-LLM verdict can't guarantee an SLA. The
`hasCriticalSignal` floor means a clearly critical message can *never* be reported below
`High`, even on an LLM miss or in offline mode. The same function powers the no-key
heuristic, so the app is useful and safe before a key is ever configured.

## Results

Before → after on the previously-broken cases (now covered by `npm test`, **14/14**):

| Message | Before | After |
|---------|--------|-------|
| `Server down now` | Low · "restart your browser" | **High · Escalate · Technical Support · page on-call** |
| `Database connection lost` | Low | **High · Escalate** |
| `Thank you so much!!! … amazing!!!` | High | **Low · no escalation** |
| `Could you add an export to CSV feature?` | "check billing portal" | **Feature Request · Product backlog** |
| *(no API key)* | **blank white screen** | **renders, heuristic mode** |

## What I'd do next (not in this change)

- **Move the Groq call to a small backend proxy.** `dangerouslyAllowBrowser: true` ships
  the API key to every browser. A serverless function keeps the key server-side and adds
  rate-limiting/auditing. This is the #1 production blocker.
- **History/Dashboard polish:** History sorts alphabetically by message text instead of by
  recency; Dashboard's "avg/day" divides by a hard-coded 7. Surface `routedTeam`/`escalate`
  in History too.
- **Feedback loop:** let agents correct a verdict and feed corrections back as few-shot
  examples to raise accuracy over time.
- **Confidence-gated auto-routing:** auto-route high-confidence messages; send low-confidence
  ones to a human review queue.
