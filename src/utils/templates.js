/**
 * Recommendation Templates - Maps categories and urgency to recommended actions
 */

const actionTemplates = {
  "Billing Issue": {
    High: "Escalate to billing team immediately — account access may be affected.",
    Medium: "Review account charges and respond within 4 hours.",
    Low: "Ask user to check billing portal."
  },
  "Technical Problem": {
    High: "Escalate to engineering team immediately.",
    Medium: "Collect error details and assign to technical support queue.",
    Low: "Suggest user restart their browser or clear cache."
  },
  "Feature Request": {
    High: "Log in feature request tracker and notify product team.",
    Medium: "Log in feature request tracker and notify product team.",
    Low: "Log in feature request tracker for product team review."
  },
  "General Inquiry": {
    High: "Respond with personalized assistance immediately.",
    Medium: "Respond with FAQ link and follow up if unresolved.",
    Low: "Respond with FAQ link."
  },
  "Unknown": {
    High: "Escalate for immediate manual review.",
    Medium: "Review manually.",
    Low: "Review manually."
  }
}

/**
 * Get recommended action for a given category and urgency
 *
 * @param {string} category - The message category
 * @param {string} urgency - The urgency level (High/Medium/Low)
 * @returns {string} - Recommended next step
 */
export function getRecommendedAction(category, urgency) {
  const templates = actionTemplates[category]
  if (!templates) return "No recommendation available."
  return templates[urgency] || templates['Medium']
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
 * @returns {boolean} - Whether to escalate
 */
export function shouldEscalate(category, urgency) {
  if (urgency === 'High') return true
  if (urgency === 'Medium' && (category === 'Technical Problem' || category === 'Billing Issue')) return true
  return false
}
