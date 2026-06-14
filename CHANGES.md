# Bug Fixes & Improvements

## Critical

### 1. ALL CAPS messages scored as less urgent
**File:** `src/utils/urgencyScorer.js`

ALL CAPS text signals frustration or urgency from the customer. The original code applied a `-50` penalty, making these messages score lower. Fixed to `+50` so they correctly increase the urgency score.

### 2. Off-hours and weekend messages scored as less urgent
**File:** `src/utils/urgencyScorer.js`

The scorer reduced urgency by 20 on weekends and 15 outside business hours. This is backwards — a message sent at 2am Sunday has no support staff available and may need earlier attention when the team comes online, not less. Time of submission has no logical bearing on how urgent the message content is. Removed both deductions entirely.

### 3. Feature Request routed to the billing portal
**File:** `src/utils/templates.js`

The recommended action for "Feature Request" was `"Ask user to check billing portal."` — a copy-paste of the Billing Issue entry. Fixed to route feature requests to the product team feature tracker instead.

---

## High

### 4. History sorted alphabetically by message text instead of by date
**File:** `src/pages/HistoryPage.jsx`

The history list was sorted using `a.message.localeCompare(b.message)`, which ordered entries A–Z by the message content. Agents reviewing history expect to see the most recent messages first. Fixed to sort by `timestamp` descending.

### 5. "Avg Per Day" always divided by 7 regardless of actual history span
**File:** `src/pages/DashboardPage.jsx`

`totalDays` was hardcoded to `7` whenever any history existed, making the metric meaningless. Fixed to calculate the actual span in days between the oldest and newest entries in history.

### 6. LLM had no system prompt and category detection used fragile keyword matching
**File:** `src/utils/llmHelper.js`

The original code sent the customer message with no system prompt, giving the model no guidance on valid categories or output format. It then scanned the raw free-text response for words like `"billing"` or `"technical"` — meaning a response like `"This is not a technical issue"` would incorrectly match as "Technical Problem".

Fixed by:
- Adding a system prompt that lists the four valid categories with clear descriptions
- Requesting structured JSON output: `{"category": "...", "reasoning": "..."}`
- Validating the returned category against the allowed list before accepting it
- Lowering temperature from `0.7` to `0.3` for more consistent, predictable output
- Removing the unused `lines` variable left over from an earlier parsing attempt

---

## Medium

### 7. `shouldEscalate` ignored category and urgency, and was never called
**File:** `src/utils/templates.js`, `src/pages/AnalyzePage.jsx`

The function accepted `category` and `urgency` parameters but only checked `message.length > 100`, making it useless. It was also never called anywhere in the app.

Fixed the logic to escalate when:
- Urgency is `High` (any category)
- Urgency is `Medium` and category is `Billing Issue` or `Technical Problem`

Wired it into `AnalyzePage` so it runs on every analysis and displays a red escalation banner in the results when triggered.

### 8. `getRecommendedAction` ignored the urgency parameter
**File:** `src/utils/templates.js`, `src/pages/AnalyzePage.jsx`

The function accepted `urgency` but returned the same single string for every urgency level. A High urgency billing issue and a Low urgency billing question got identical recommendations.

Restructured `actionTemplates` so each category has three urgency-specific recommendations (High / Medium / Low). Updated `AnalyzePage` to pass `urgency` when calling the function.
