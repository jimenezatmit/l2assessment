/**
 * Recommendation Templates - Maps categories to recommended actions
 */

const actionTemplates = {
  "Billing Issue": "Ask user to check billing portal.",
  "Technical Problem": "Suggest user to restart their browser.",
  "General Inquiry": "Respond with FAQ link.",
  "Feature Request": "Log the request and share it with the product team for review.",
  "Unknown": "Review manually."
}

/**
 * Get recommended action for a given category
 * 
 * @param {string} category - The message category
 * @param {string} urgency - The urgency level
 * @returns {string} - Recommended next step
 */
export function getRecommendedAction(category, urgency) {
  return actionTemplates[category] || "No recommendation available."
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
 * Determines whether a result needs a human to look at it before it's
 * auto-routed, rather than treating every categorization as equally
 * trustworthy.
 *
 * @param {{category: string, urgency: string, source: 'ai'|'mock', confidence: 'high'|'low'}} result
 * @returns {boolean} - Whether to flag for human review
 */
export function shouldEscalate({ category, urgency, source, confidence }) {
  if (category === 'Unknown') return true
  if (confidence === 'low') return true
  // Don't let a high-urgency message get auto-routed on the crude
  // keyword fallback alone - that's exactly when a wrong call matters most.
  if (urgency === 'High' && source === 'mock') return true
  return false
}
