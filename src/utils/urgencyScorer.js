/**
 * Urgency Scorer - Rule-based urgency calculation for customer support messages.
 * 
 * This module evaluates incoming customer support messages and assigns an urgency
 * tier ('High', 'Medium', or 'Low'). In the broader triage system, this urgency rating
 * is paired with the AI-determined category to guide response time targets, escalation
 * paths, and agent prioritization.
 */

// Critical keywords indicating service outages, data corruption, or immediate business blockage.
const CRITICAL_KEYWORDS = [
  'server down',
  'down now',
  'system down',
  'site is down',
  'outage',
  'database connection lost',
  'data loss',
  'critical',
  'emergency',
  'crash',
  'crashed',
  'security breach',
  'breach',
  'production down',
  'cannot access account',
  "can't access account",
  'payment failed',
  'locked out'
];

// High-impact problem indicators that signal broken workflows or blockers.
const HIGH_IMPACT_KEYWORDS = [
  'down',
  'broken',
  'cannot access',
  "can't access",
  'not working',
  'failed',
  'urgent',
  'immediately',
  'asap',
  'blocking',
  'unable to',
  'error 500',
  'timeout'
];

// Positive sentiment keywords expressing appreciation or satisfaction.
const POSITIVE_KEYWORDS = [
  'thank',
  'thanks',
  'appreciate',
  'great work',
  'wonderful',
  'excellent',
  'love',
  'happy',
  'nice design',
  'positive feedback',
  'kudos'
];

/**
 * Calculates the urgency level of a customer message.
 *
 * How it works:
 * 1. Starts with a baseline neutral score of 50.
 * 2. Scans for critical outage or data loss phrases (+45 points), driving the score to High.
 * 3. Scans for operational blocker phrases (+25 points).
 * 4. Checks for genuine urgency exclamation marks, but explicitly ignores them if the message
 *    is purely positive praise or gratitude (preventing happy thank-you notes from false alarms).
 * 5. Deducts points for purely positive feedback, guiding non-issues into the Low urgency bucket.
 * 6. Never penalizes short messages for brevity if they report genuine outages or blockers.
 *
 * @param {string} message - Raw customer support message text.
 * @returns {'High' | 'Medium' | 'Low'} - The calculated urgency level.
 */
export function calculateUrgency(message) {
  if (!message || typeof message !== 'string') {
    return 'Low';
  }

  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return 'Low';
  }

  const lower = trimmed.toLowerCase();
  let urgencyScore = 50;

  // Check if message is predominantly positive feedback with no mention of problems
  const hasPositiveWords = POSITIVE_KEYWORDS.some(word => lower.includes(word));
  const hasCriticalWords = CRITICAL_KEYWORDS.some(phrase => lower.includes(phrase));
  const hasHighImpactWords = HIGH_IMPACT_KEYWORDS.some(phrase => lower.includes(phrase));

  // 1. Critical outage and data loss detection
  // Outages and critical failures require immediate response regardless of message length.
  if (hasCriticalWords) {
    urgencyScore += 45;
  } else if (hasHighImpactWords) {
    urgencyScore += 25;
  }

  // 2. Exclamation mark handling
  // Exclamation points indicate excitement or alarm.
  // If the customer is thanking us or giving positive feedback, exclamations mean joy, not urgency.
  const exclamationCount = (message.match(/!/g) || []).length;
  if (!hasPositiveWords && exclamationCount > 0) {
    // Add urgency for exclamations in problem reports, capped at +20 to avoid run-away scores
    urgencyScore += Math.min(exclamationCount * 10, 20);
  }

  // 3. Positive sentiment deduction
  // Positive feedback, compliment notes, and thank-yous are not operational emergencies.
  if (hasPositiveWords && !hasCriticalWords && !hasHighImpactWords) {
    urgencyScore -= 35;
  }

  // 4. Low-information / Greeting-only check
  // Minimal inputs like "hi" or "hello" without substantive content default to Low urgency.
  if (trimmed.length < 15 && !hasCriticalWords && !hasHighImpactWords) {
    urgencyScore -= 25;
  }

  // 5. General inquiry detection
  // Casual informational questions (e.g. "What are your business hours?") lean towards Low/Medium.
  if (lower.startsWith('what are your') || lower.includes('business hours') || lower.includes('pricing')) {
    if (!hasCriticalWords && !hasHighImpactWords) {
      urgencyScore -= 20;
    }
  }

  // Determine final urgency tier based on calibrated thresholds:
  // - High (>= 75): Outages, data loss, blocking issues, or severe payment blocks.
  // - Low (<= 35): Compliments, general questions, low-information greetings.
  // - Medium: Standard troubleshooting, feature requests, and regular support tickets.
  if (urgencyScore >= 75) {
    return 'High';
  }
  if (urgencyScore <= 35) {
    return 'Low';
  }
  return 'Medium';
}
