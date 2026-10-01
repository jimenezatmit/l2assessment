/**
 * Urgency Scorer - Rule-based urgency calculation
 *
 * Scores urgency from the content of the message (what's actually wrong,
 * if anything) rather than surface signals like punctuation, capitalization,
 * message length, or the time of day the message happens to be analyzed.
 * Those surface signals don't track real severity - a short "Server down"
 * message is more urgent than a long, cheerful thank-you note full of "!".
 */

const CRITICAL_PHRASES = [
  'down', 'outage', 'offline', "can't access", 'cannot access',
  "can't log in", 'cannot log in', 'locked out', 'lost access',
  'connection lost', 'database',
  'emergency', 'urgent', 'asap', 'immediately', 'critical',
  'production', 'crash', 'crashed', 'broken', 'security breach',
  'hacked', 'unauthorized charge', 'overcharged', 'charged twice',
  "won't load", 'not loading at all'
]

// Data loss shows up in too many phrasings to list exhaustively
// ("data is lost", "lost all my data", "data loss", "my files are gone") -
// detect it as co-occurrence instead of exact phrases.
const DATA_WORDS = ['data', 'files', 'records', 'documents']
const LOSS_WORDS = ['lost', 'loss', 'deleted', 'gone', 'disappeared', 'wiped']

function hasDataLossSignal(text) {
  return DATA_WORDS.some(d => text.includes(d)) && LOSS_WORDS.some(l => text.includes(l))
}

const MODERATE_PHRASES = [
  'error', 'bug', 'issue', 'problem', 'not working', 'slow',
  'loading', 'failed', 'fail', 'stuck', 'timeout', 'timing out', 'glitch'
]

const NON_URGENT_PHRASES = [
  'thank', 'thanks', 'appreciate', 'feedback', 'suggestion',
  'would love', 'would like to see', 'feature request', 'nice to have',
  'just wanted', 'great job', 'business hours', 'wondering if', 'curious'
]

function countMatches(text, phrases) {
  return phrases.filter(phrase => text.includes(phrase)).length
}

export function calculateUrgency(message) {
  const text = message.toLowerCase()

  const criticalHits = countMatches(text, CRITICAL_PHRASES) + (hasDataLossSignal(text) ? 1 : 0)
  const moderateHits = countMatches(text, MODERATE_PHRASES)
  const nonUrgentHits = countMatches(text, NON_URGENT_PHRASES)

  let score = 20

  if (criticalHits > 0) score += 55
  if (moderateHits > 0) score += 25
  if (criticalHits > 1) score += 10

  if (criticalHits === 0 && moderateHits === 0 && nonUrgentHits > 0) {
    score -= 15
  }

  score = Math.max(0, Math.min(100, score))

  if (score >= 65) return "High"
  if (score >= 35) return "Medium"
  return "Low"
}
