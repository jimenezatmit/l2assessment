/**
 * Recommendation Templates - Maps categories to recommended actions
 * Now includes urgency-aware suggestions and more helpful guidance
 */

const actionTemplates = {
  "Billing Issue": {
    "High": "URGENT: Escalate to billing team immediately. Customer may be blocked from service. Check for failed payments or account restrictions.",
    "Medium": "Route to billing team. Review customer's subscription status and recent payment history before responding.",
    "Low": "Send self-service billing portal link: [billing.relayai.com]. Include FAQ for common billing questions."
  },
  "Technical Problem": {
    "High": "URGENT: Escalate to engineering team. Potential service outage or critical bug affecting customer's business operations.",
    "Medium": "Create support ticket for technical team. Ask customer for: browser/device info, steps to reproduce, screenshots if applicable.",
    "Low": "Send troubleshooting checklist: clear cache, try different browser, check internet connection. Provide link to technical documentation."
  },
  "Feature Request": {
    "High": "Customer is requesting critical missing functionality. Forward to product team with business impact assessment.",
    "Medium": "Log feature request in product backlog. Send acknowledgment and link to public roadmap or feature request portal.",
    "Low": "Thank customer for feedback. Direct them to feature request form: [feedback.relayai.com]."
  },
  "General Inquiry": {
    "High": "Customer needs immediate clarification on account or service access. Prioritize response within 1 hour.",
    "Medium": "Standard inquiry response. Check knowledge base for relevant articles before crafting response.",
    "Low": "Send relevant FAQ links and documentation. No immediate follow-up needed unless customer responds."
  },
  "Unknown": {
    "High": "MANUAL REVIEW REQUIRED: Message is unclear but marked urgent. Assign to senior support agent immediately.",
    "Medium": "Flag for manual review. Message doesn't fit standard categories - may need clarification from customer.",
    "Low": "Ask customer for more details about their question or issue to properly categorize and assist."
  }
}

/**
 * Get recommended action for a given category and urgency level
 * 
 * @param {string} category - The message category
 * @param {string} urgency - The urgency level (High, Medium, Low)
 * @returns {string} - Recommended next step
 */
export function getRecommendedAction(category, urgency = "Medium") {
  // Get the category's actions
  const categoryActions = actionTemplates[category]
  
  if (!categoryActions) {
    return "Category not recognized. Please review manually."
  }
  
  // If category has urgency-specific actions, return the appropriate one
  if (typeof categoryActions === 'object') {
    return categoryActions[urgency] || categoryActions["Medium"]
  }
  
  // Fallback for any legacy simple string templates
  return categoryActions
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
 * Determines if message should be escalated based on urgency and category
 * 
 * @param {string} category - The message category
 * @param {string} urgency - The urgency level
 * @returns {boolean} - Whether to escalate to human agent
 */
export function shouldEscalate(category, urgency) {
  // Always escalate high urgency messages
  if (urgency === "High") {
    return true
  }
  
  // Escalate unknown messages that are medium or high
  if (category === "Unknown" && urgency !== "Low") {
    return true
  }
  
  return false
}