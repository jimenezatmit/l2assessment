/**
 * Recommendation Templates - Maps categories to recommended actions
 */

const actionTemplates = {
  "Billing Issue": "Ask user to check billing portal and provide invoice/transaction ID. If payment failed, offer retry link and escalate if High urgency.",
  "Technical Problem": "Ask for reproduction steps, browser/OS, screenshots, and logs. If High urgency, escalate to on-call/engineering and create a ticket.",
  "General Inquiry": "Respond with relevant FAQ link and ask if they need additional help.",
  "Feature Request": "Thank the user, capture details (use-case & priority), and forward to the product suggestions board.",
  "Unknown": "Request clarification from the customer and flag for manual review."
}

/**
 * Get recommended action for a given category
 * 
 * @param {string} category - The message category
 * @param {string} urgency - The urgency level
 * @returns {string} - Recommended next step
 */
export function getRecommendedAction(category, urgency) {
  const base = actionTemplates[category] || "No recommendation available.";
  if (urgency === 'High' && (category === 'Technical Problem' || category === 'Billing Issue')) {
    return `${base} Escalate to on-call/support immediately.`;
  }
  return base;
}

/**
 * Get all available categories
 * 
 * @returns {string[]} - List of categories
 */
export function getAvailableCategories() {
  return Object.keys(actionTemplates)
}

/**
 * Determines if message should be escalated
 * 
 * @param {string} category - The message category
 * @param {string} urgency - The urgency level
 * @param {string} message - The original message
 * @returns {boolean} - Whether to escalate
 */
export function shouldEscalate(category, urgency, message) {
  const lower = message.toLowerCase();
  if (urgency === 'High') return true;
  if ((category === 'Billing Issue' || category === 'Technical Problem') && urgency === 'Medium') return true;
  if (lower.includes('production') || lower.includes('server down') || lower.includes('security') || lower.includes('data loss')) return true;
  return false;
}
