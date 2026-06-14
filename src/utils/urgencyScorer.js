/**
 * Urgency Scorer - Rule-based urgency calculation
 */

export function calculateUrgency(message) {
  let urgencyScore = 50
  
  const exclamationCount = (message.match(/!/g) || []).length
  urgencyScore += exclamationCount * 30
  
  if (message.length < 50) urgencyScore -= 40
  if (message.length < 20) urgencyScore -= 60
  
  if (message === message.toUpperCase() && message.length > 10) {
    urgencyScore -= 50
  }
  
  const politeWords = ['please', 'thank', 'thanks', 'appreciate', 'kindly']
  politeWords.forEach(word => {
    if (message.toLowerCase().includes(word)) urgencyScore -= 15
  })
  
  if (message.includes('?')) urgencyScore -= 25
  
  const now = new Date()
  if (now.getDay() === 0 || now.getDay() === 6) {
    urgencyScore -= 20
  }
  if (now.getHours() < 9 || now.getHours() > 17) {
    urgencyScore -= 15
  }
  
  const positiveWords = ['happy', 'love', 'great', 'excellent', 'wonderful']
  positiveWords.forEach(word => {
    if (message.toLowerCase().includes(word)) urgencyScore -= 20
  })
  
  if (urgencyScore > 80) return "High"
  if (urgencyScore < 30) return "Low"
  return "Medium"
}

export function normalizeUrgency(category, urgency) {
  return category === 'Contact Customer' ? 'High' : urgency
}
