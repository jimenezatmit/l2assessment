import Groq from 'groq-sdk'
import { calculateUrgency, hasCriticalSignal } from './urgencyScorer.js'
import { getRecommendedAction, getRoutedTeam, shouldEscalate } from './templates.js'

/**
 * Triage engine for customer-support messages.
 *
 * One Groq call returns a structured verdict (category, urgency, escalation,
 * confidence, reasoning) using JSON mode at temperature 0 for consistency. When no
 * API key is configured — or the call fails — it degrades gracefully to a local
 * heuristic instead of crashing or guessing from free text.
 */

export const CATEGORIES = [
  'Billing Issue',
  'Technical Problem',
  'Feature Request',
  'General Inquiry',
]

const URGENCIES = ['High', 'Medium', 'Low']
const MODEL = 'llama-3.3-70b-versatile'
// Vite statically inlines `import.meta.env.VITE_GROQ_API_KEY` in the browser; the
// guard keeps the module importable in plain Node (e.g. tests) where it's undefined.
const API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GROQ_API_KEY) ||
  undefined

// Construct the client lazily. Building it at module load with a missing key throws
// inside the SDK *before React mounts*, which white-screened the whole app.
let _client = null
function getClient() {
  if (!API_KEY) return null
  if (!_client) {
    _client = new Groq({ apiKey: API_KEY, dangerouslyAllowBrowser: true })
  }
  return _client
}

/** True when running without an API key (results come from the local heuristic). */
export function isUsingMockMode() {
  return !API_KEY
}

const SYSTEM_PROMPT = `You are the triage engine for Relay AI, a platform that helps small-business support teams categorize, prioritize, and route incoming customer messages.

Classify the customer's message. Respond with ONLY a single JSON object — no markdown, no commentary — with exactly these fields:
{
  "category": one of "Billing Issue", "Technical Problem", "Feature Request", "General Inquiry",
  "urgency": one of "High", "Medium", "Low",
  "escalate": boolean,
  "confidence": number,
  "reasoning": string
}

Category guide:
- "Billing Issue": payments, charges, invoices, refunds, subscriptions, pricing, plan changes.
- "Technical Problem": bugs, errors, outages, things not working, performance, login/access problems.
- "Feature Request": suggestions or asks for new or improved functionality.
- "General Inquiry": questions, how-tos, general information, and positive feedback or thanks.

Urgency reflects BUSINESS IMPACT — not tone, punctuation, length, or time of day. A calm one-line "the server is down" is High; an excited "thank you!!!" is Low.
- "High": a service outage or data/security issue; the customer is blocked from a core task or from paying; churn, refund demands, or legal/escalation language; production or many users affected; explicitly time-critical.
- "Medium": a real but non-blocking problem, a degraded experience, or a billing question that doesn't block access.
- "Low": general questions, how-tos, feature ideas, and positive feedback.

Set "escalate" to true when the issue needs immediate human action (outage, security, billing access block, churn or legal risk) rather than the normal queue.
"confidence" is your confidence in the category, from 0.0 to 1.0.
"reasoning" is at most two short plain-language sentences.
Be deterministic: identical messages must always produce identical output.`

/**
 * Triage a single customer-support message.
 *
 * @param {string} message
 * @returns {Promise<{
 *   category: string, urgency: string, escalate: boolean, confidence: number,
 *   reasoning: string, recommendedAction: string, routedTeam: string, source: string
 * }>}
 */
export async function triageMessage(message) {
  const client = getClient()
  if (!client) return heuristicTriage(message, 'no API key configured')

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
    })

    const raw = response.choices?.[0]?.message?.content ?? '{}'
    return normalizeVerdict(JSON.parse(raw), message)
  } catch (error) {
    console.warn('Groq triage failed, falling back to heuristic:', error.message)
    return heuristicTriage(message, 'AI unavailable')
  }
}

// Backwards-compatible alias for the previous API.
export const categorizeMessage = triageMessage

/**
 * Validate and enrich the model's JSON, then derive routing deterministically.
 * The model's free-form output is never trusted blindly: unknown enum values fall
 * back to safe defaults, and a clearly critical message is floored at High urgency.
 */
function normalizeVerdict(parsed, message) {
  const category = CATEGORIES.includes(parsed?.category) ? parsed.category : 'General Inquiry'

  let urgency = URGENCIES.includes(parsed?.urgency) ? parsed.urgency : calculateUrgency(message)
  if (hasCriticalSignal(message)) urgency = 'High' // safety-net floor

  const escalate =
    parsed?.escalate === true || shouldEscalate(category, urgency, message)
  const confidence =
    typeof parsed?.confidence === 'number' ? clamp01(parsed.confidence) : 0.7
  const reasoning =
    String(parsed?.reasoning ?? '').trim() || 'No reasoning provided by the model.'

  return {
    category,
    urgency,
    escalate,
    confidence,
    reasoning,
    recommendedAction: getRecommendedAction(category, urgency),
    routedTeam: getRoutedTeam(category),
    source: 'ai',
  }
}

/**
 * Fully local triage — used when there's no API key or the call fails. Keyword
 * category detection plus impact-based urgency. Lower confidence flags it for review.
 */
function heuristicTriage(message, reason) {
  const category = detectCategory(message)
  const urgency = calculateUrgency(message)

  return {
    category,
    urgency,
    escalate: shouldEscalate(category, urgency, message),
    confidence: 0.5,
    reasoning: `Heuristic triage (${reason}). Classified by keyword and impact rules; double-check edge cases.`,
    recommendedAction: getRecommendedAction(category, urgency),
    routedTeam: getRoutedTeam(category),
    source: 'heuristic',
  }
}

function detectCategory(message = '') {
  const m = message.toLowerCase()
  if (/\b(bill|payment|charge|invoice|credit card|subscription|refund|receipt|pricing|plan|upgrade|downgrade)\b/.test(m)) {
    return 'Billing Issue'
  }
  if (/\b(bug|error|broken|not working|won'?t|can'?t|cannot|crash|down|outage|slow|loading|timeout|glitch|503|500|connection|breach|hacked|security|exposed|data ?loss|leak|unauthor|vulnerab)\b/.test(m)) {
    return 'Technical Problem'
  }
  if (/\b(feature|add (a|an|support)|would like to see|suggestion|wish|enhancement|would be (great|nice)|dark mode|integration)\b/.test(m)) {
    return 'Feature Request'
  }
  return 'General Inquiry'
}

function clamp01(n) {
  return Math.max(0, Math.min(1, n))
}
