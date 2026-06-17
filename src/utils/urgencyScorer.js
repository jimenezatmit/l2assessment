/**
 * Urgency Scorer — impact-based.
 *
 * Urgency reflects BUSINESS IMPACT, not surface features. The old scorer keyed off
 * punctuation, length, ALL-CAPS, and time of day, which inverted reality: a terse
 * "server down now" scored Low while an excited "thank you!!!" scored High.
 *
 * This module instead looks at what the message is *about*. It powers:
 *   - the offline / heuristic path (when no AI key is configured), and
 *   - a deterministic safety-net floor the AI path cannot fall below for clearly
 *     critical messages (see `hasCriticalSignal`).
 */

// Business-critical situations: outage, data/security, blocked payment/access,
// explicit time pressure, or production / many-users impact.
const CRITICAL_PATTERNS = [
  /\b(outage|down|offline|crash(ed|ing)?|503|500)\b/,
  /\bnot (working|loading|responding)\b/,
  /\b(won'?t|can'?t|cannot|unable to) (load|open|access|log ?in|sign ?in|connect|check ?out|pay)\b/,
  /\b(locked out|can'?t get in|access denied|unavailable)\b/,
  /\b(connection (lost|dropped|failed|refused|timed? ?out)|lost connection|database (is )?(down|lost))\b/,
  /\b(data ?loss|lost (all|my|our) data|breach|hacked|security|unauthor[i]?[sz]ed|leak(ed|ing)?|exposed|gdpr)\b/,
  /\b(payment (failed|declined|isn'?t working)|double[- ]?charged|charged twice|can'?t (pay|check ?out))\b/,
  /\b(urgent|asap|immediately|emergency|critical|right now|losing (money|sales|customers|revenue))\b/,
  /\b(production|prod\b|all (our )?(users|customers)|everyone|entire team|nobody can|no one can)\b/,
  /\b(deadline|time[- ]sensitive|by (today|tomorrow|eod|end of day))\b/,
]

// Elevated: a real problem or churn/escalation risk, but not necessarily critical.
const ELEVATED_PATTERNS = [
  /\b(cancel|refund|unsubscrib|switch(ing)? (to|away)|competitor|disappointed|frustrat(ed|ing)|unacceptable|ridiculous|angry|upset)\b/,
  /\b(lawyer|legal|sue|chargeback|dispute)\b/,
  /\b(bug|error|broken|fail(ed|ing|s)?|glitch|timeout|timing out|slow(ly)?|stuck|freez(e|ing))\b/,
  /\b(third (time|attempt)|again|still (not|broken|happening|isn'?t)|repeatedly|keeps? (happening|crashing|failing))\b/,
]

// Clearly low-stakes: gratitude, praise, idle curiosity, nice-to-haves.
const LOW_PATTERNS = [
  /\b(thank|thanks|thx|appreciate|love (it|this|your)|great (job|work)|awesome|amazing|wonderful|kudos)\b/,
  /\b(just (wondering|curious|browsing)|no rush|whenever|out of curiosity|nice to have)\b/,
  /\b(feature request|would (be (nice|great)|like to see)|suggestion|wish (you|it)|dark mode)\b/,
]

const test = (patterns, text) => patterns.some((re) => re.test(text))

/**
 * True when a message clearly describes a business-critical situation.
 * Used as a hard floor so the urgency can never be reported below "High" for these.
 *
 * @param {string} message
 * @returns {boolean}
 */
export function hasCriticalSignal(message = '') {
  return test(CRITICAL_PATTERNS, message.toLowerCase())
}

/**
 * Estimate urgency from the meaning of the message.
 *
 * @param {string} message
 * @returns {"High" | "Medium" | "Low"}
 */
export function calculateUrgency(message = '') {
  const m = message.toLowerCase().trim()
  if (!m) return 'Low'

  let score = 0
  if (test(CRITICAL_PATTERNS, m)) score += 3
  score += ELEVATED_PATTERNS.filter((re) => re.test(m)).length
  score -= LOW_PATTERNS.filter((re) => re.test(m)).length

  // A bare question with no problem signal is informational, not urgent.
  if (score <= 0 && m.includes('?')) score -= 1

  if (score >= 3) return 'High'
  if (score >= 1) return 'Medium'
  return 'Low'
}
