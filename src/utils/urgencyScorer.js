/**
 * Urgency Scorer - Rule-based urgency calculation
 */

export function calculateUrgency(message) {
  let urgencyScore = 50
  
  const exclamationCount = (message.match(/!/g) || []).length
  // Emphasis via exclamation marks should increase urgency but cap impact
  urgencyScore += Math.min(exclamationCount * 20, 60)
  
  // Precompute lowercase and outage detection to avoid penalizing short
  // but critical outage messages (e.g., "Server down!")
  const lower = message.toLowerCase()
  const isOutage = lower.includes('production') || lower.includes('server down') || lower.includes('outage') || lower.includes('data loss')

  // Short messages often lack detail but can be urgent ("Server down!")
  // Skip length penalties when the message contains outage/production keywords.
  if (!isOutage) {
    if (message.length < 50) urgencyScore -= 20
    if (message.length < 20) urgencyScore -= 40
  }
  
  // ALL CAPS often indicates urgency/shouting — increase score
  if (message === message.toUpperCase() && message.length > 10) {
    urgencyScore += 20
  }
  
  const politeWords = ['please', 'thank', 'thanks', 'appreciate', 'kindly']
  politeWords.forEach(word => {
    if (lower.includes(word)) urgencyScore -= 10
  })
  
  // Questions are often lower urgency (support question), but not always
  if (message.includes('?')) urgencyScore -= 15
  
  const now = new Date()
  if (now.getDay() === 0 || now.getDay() === 6) {
    urgencyScore -= 10
  }
  if (now.getHours() < 9 || now.getHours() > 17) {
    urgencyScore -= 5
  }
  
  const positiveWords = ['happy', 'love', 'great', 'excellent', 'wonderful']
  positiveWords.forEach(word => {
    if (lower.includes(word)) urgencyScore -= 15
  })
  
  // Boost urgency if message references production/outage keywords
  if (isOutage) {
    urgencyScore += 30
  }
  
  // Normalize and clamp
  if (urgencyScore > 90) urgencyScore = 90
  if (urgencyScore < 0) urgencyScore = 0

  if (urgencyScore >= 70) return "High"
  if (urgencyScore <= 40) return "Low"
  return "Medium"
}
