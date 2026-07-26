/**
 * Sentiment Scorer - Keyword-based positive/negative feedback detection.
 * Mirrors the approach used in urgencyScorer.js.
 */

const POSITIVE_KEYWORDS = [
  'thank you',
  'thanks',
  'appreciate',
  'great',
  'awesome',
  'love',
  'amazing',
  'excellent',
  'fantastic',
  'wonderful',
  'happy',
  'pleased',
  'satisfied',
  'nice job',
  'keep up the great work'
]

const NEGATIVE_KEYWORDS = [
  'hate',
  'terrible',
  'worst',
  'awful',
  'angry',
  'frustrated',
  'frustrating',
  'disappointed',
  'annoyed',
  'unacceptable',
  'ridiculous',
  'useless',
  'poor service',
  'bad experience',
  'not happy'
]

export function scoreSentiment(message) {
  const normalized = message.toLowerCase()

  const positiveMatches = POSITIVE_KEYWORDS.filter(keyword => normalized.includes(keyword))
  const negativeMatches = NEGATIVE_KEYWORDS.filter(keyword => normalized.includes(keyword))

  if (negativeMatches.length > positiveMatches.length) {
    return { sentiment: 'Negative', trigger: negativeMatches }
  }

  if (positiveMatches.length > 0) {
    return { sentiment: 'Positive', trigger: positiveMatches }
  }

  return { sentiment: 'Neutral', trigger: [] }
}
