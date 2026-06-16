/**
 * Urgency Scorer - Rule-based urgency calculation
 */

export function calculateUrgency(message) {
  let urgencyScore = 50

  const text = message.toLowerCase()

  // Outage / breakage language — strong signal that something is broken
  const outageWords = [
    'down', 'outage', 'broken', 'not working', "isn't working", 'crash',
    'crashed', 'error', 'errors', 'failed', 'failing', 'failure', 'bug',
    'cannot log in', "can't log in", 'cannot login', 'unable to', 'offline',
    'production', 'data loss', 'locked out', 'stuck', 'frozen', 'timeout'
  ]
  outageWords.forEach(word => {
    if (text.includes(word)) urgencyScore += 20
  })

  // Billing / payment problems
  const billingWords = [
    'charged', 'charge', 'overcharged', 'double charged', 'charged twice',
    'billing', 'invoice', 'refund', 'payment', 'declined', 'fraud',
    'unauthorized', 'money', 'subscription'
  ]
  billingWords.forEach(word => {
    if (text.includes(word)) urgencyScore += 15
  })

  // Anger / frustration
  const angerWords = [
    'furious', 'angry', 'frustrated', 'frustrating', 'ridiculous',
    'unacceptable', 'terrible', 'awful', 'horrible', 'worst', 'hate',
    'disappointed', 'fed up', 'sick of', 'never again'
  ]
  angerWords.forEach(word => {
    if (text.includes(word)) urgencyScore += 20
  })

  // Explicit urgency words
  const urgentWords = [
    'urgent', 'urgently', 'asap', 'emergency', 'immediately', 'right now',
    'critical', 'now', 'time sensitive', 'deadline', 'demo'
  ]
  urgentWords.forEach(word => {
    if (text.includes(word)) urgencyScore += 25
  })

  // Exclamation marks emphasise intensity
  const exclamationCount = (message.match(/!/g) || []).length
  urgencyScore += Math.min(exclamationCount, 3) * 10

  // Detect whether this is a genuinely positive / thank-you message.
  // Only lower the score when there is praise and no complaint signal.
  const positiveWords = [
    'thank', 'thanks', 'appreciate', 'great', 'awesome', 'love',
    'excellent', 'wonderful', 'happy', 'amazing', 'fantastic', 'perfect'
  ]
  const hasPositive = positiveWords.some(word => text.includes(word))

  const complaintSignals = [
    ...outageWords, ...billingWords, ...angerWords, ...urgentWords
  ]
  const hasComplaint = complaintSignals.some(word => text.includes(word))

  if (hasPositive && !hasComplaint) {
    urgencyScore -= 40
  }

  if (urgencyScore >= 80) return "High"
  if (urgencyScore <= 40) return "Low"
  return "Medium"
}
