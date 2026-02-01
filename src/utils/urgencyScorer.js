/**
 * Urgency Scorer - Rule-based urgency calculation
 * Analyzes message content for urgency indicators
 */

export function calculateUrgency(message) {
  let urgencyScore = 50; // Start at medium baseline
  
  const lowerMessage = message.toLowerCase();
  
  // HIGH URGENCY INDICATORS (boost score)
  
  // Critical keywords that indicate service is down or broken
  const criticalKeywords = ['not working', 'not going through', 'wont work', 'broken', 'down', 'failed', 'error', 'crash', 'cant access', 'cannot access', 'blocked', 'urgent'];
  criticalKeywords.forEach(keyword => {
    if (lowerMessage.includes(keyword)) {
      urgencyScore += 25;
    }
  });
  
  // Payment/billing issues that are critical
  const billingUrgentKeywords = ['payment failed', 'cant pay', 'cannot pay', 'billing error', 'charged twice', 'unauthorized charge', 'locked out'];
  billingUrgentKeywords.forEach(keyword => {
    if (lowerMessage.includes(keyword)) {
      urgencyScore += 30;
    }
  });
  
  // Billing-related but not critical
  const billingMediumKeywords = ['upgrade', 'downgrade', 'change plan', 'subscription'];
  billingMediumKeywords.forEach(keyword => {
    if (lowerMessage.includes(keyword)) {
      urgencyScore += 15;
    }
  });
  
  // Multiple exclamation marks indicate frustration/urgency
  const exclamationCount = (message.match(/!/g) || []).length;
  if (exclamationCount >= 2) {
    urgencyScore += 20;
  }
  if (exclamationCount === 1) {
    urgencyScore += 10;
  }
  
  // ALL CAPS indicates frustration (but only if substantial length)
  if (message === message.toUpperCase() && message.length > 15) {
    urgencyScore += 25;
  }
  
  // MEDIUM URGENCY INDICATORS
  
  // Questions about problems (not just general questions)
  if (lowerMessage.includes('?') && (lowerMessage.includes('issue') || lowerMessage.includes('problem'))) {
    urgencyScore += 10;
  }
  
  // LOW URGENCY INDICATORS (reduce score)
  
  // Positive feedback or appreciation
  const positiveKeywords = ['thank', 'thanks', 'great', 'love', 'excellent', 'appreciate'];
  positiveKeywords.forEach(keyword => {
    if (lowerMessage.includes(keyword)) {
      urgencyScore -= 15;
    }
  });
  
  // Feature requests are typically lower urgency
  if (lowerMessage.includes('feature request') || lowerMessage.includes('suggestion') || 
      lowerMessage.includes('would be nice') || lowerMessage.includes('could you add') ||
      lowerMessage.includes('can you add') || (lowerMessage.includes('add') && lowerMessage.includes('feature'))) {
    urgencyScore -= 20;
  }
  
  // Very polite language might indicate lower urgency
  if ((lowerMessage.includes('please') || lowerMessage.includes('kindly')) && 
      !lowerMessage.includes('urgent') && 
      !lowerMessage.includes('asap')) {
    urgencyScore -= 10;
  }
  
  // General questions (no problem indicators) are lower urgency
  if (lowerMessage.includes('how do i') || lowerMessage.includes('how can i') || lowerMessage.includes('where can i')) {
    urgencyScore -= 10;
  }
  
  // Determine final urgency level
  if (urgencyScore >= 80) return "High";
  if (urgencyScore <= 40) return "Low";
  return "Medium";
}