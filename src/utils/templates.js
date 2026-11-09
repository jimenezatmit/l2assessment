/**
 * Recommendation Templates & Action Routing - Maps message categories and urgency
 * to operational next steps and escalation policies.
 * 
 * In the triage system, after AI classification and urgency scoring complete, this module
 * acts as the decision engine. It determines:
 * 1. The immediate recommended next step for support agents or automated auto-responders.
 * 2. Whether the ticket requires management/engineering escalation.
 */

// Baseline action recommendations by category when urgency is standard (Low or Medium).
const baseActionTemplates = {
  "Billing Issue": "Direct user to self-service billing portal and verify invoice history.",
  "Technical Problem": "Provide standard troubleshooting guide and request device/system details.",
  "Feature Request": "Log request in product feedback backlog and share roadmap update.",
  "General Inquiry": "Respond with relevant knowledge base FAQ link and offer follow-up assistance.",
  "Unknown": "Assign ticket to tier-1 agent for manual review and categorization."
};

// High-urgency action recommendations by category when immediate operational response is required.
const highUrgencyActionTemplates = {
  "Billing Issue": "Route to billing operations immediately to unlock account and verify payment failure.",
  "Technical Problem": "Escalate immediately to on-call engineering / incident response team.",
  "Feature Request": "Acknowledge high-priority feedback with user and tag product lead for review.",
  "General Inquiry": "Fast-track response to senior customer success representative.",
  "Unknown": "Escalate to support team lead for immediate manual evaluation."
};

/**
 * Gets the recommended action for a customer support message based on its category
 * and calculated urgency level.
 * 
 * For example:
 * - A standard Technical Problem suggests troubleshooting steps.
 * - A High-urgency Technical Problem routes directly to on-call engineering.
 * - A Feature Request logs feedback to the product backlog (fixing the earlier billing portal bug).
 * 
 * @param {string} category - The AI-classified message category.
 * @param {string} [urgency='Medium'] - The rule-based urgency level ('High', 'Medium', 'Low').
 * @returns {string} - Clear, actionable recommended next step.
 */
export function getRecommendedAction(category, urgency = 'Medium') {
  if (urgency === 'High') {
    return highUrgencyActionTemplates[category] || baseActionTemplates[category] || "Escalate for immediate team review.";
  }

  return baseActionTemplates[category] || "Review manually and route to appropriate team.";
}

/**
 * Retrieves the list of standard support categories supported by the application.
 * 
 * @returns {string[]} - Array of valid category names.
 */
export function getAvailableCategories() {
  return Object.keys(baseActionTemplates);
}

// Critical keywords that mandate ticket escalation regardless of other attributes
const ESCALATION_TRIGGERS = [
  'server down',
  'down now',
  'outage',
  'database connection lost',
  'data loss',
  'security breach',
  'breach',
  'production down',
  'emergency',
  'legal action',
  'sue',
  'lawyer'
];

/**
 * Determines whether an incoming support ticket should be formally escalated
 * to management, tier-2 technical support, or security leads.
 * 
 * Logic:
 * 1. High-urgency tickets require escalation.
 * 2. Critical keywords (system down, outage, data loss, security breach) trigger automatic escalation.
 * 3. Purely positive feedback or routine feature requests are never escalated.
 * 
 * @param {string} category - The message category.
 * @param {string} urgency - The urgency level ('High', 'Medium', 'Low').
 * @param {string} message - The original customer support message.
 * @returns {boolean} - True if the ticket requires escalation, false otherwise.
 */
export function shouldEscalate(category, urgency, message = '') {
  if (!message || typeof message !== 'string') {
    return urgency === 'High';
  }

  const lower = message.toLowerCase();

  // Automatic escalation for critical system threats or legal/security mentions
  if (ESCALATION_TRIGGERS.some(trigger => lower.includes(trigger))) {
    return true;
  }

  // High urgency technical or billing tickets require escalation
  if (urgency === 'High') {
    return true;
  }

  // Standard or low urgency tickets follow normal triage workflow
  return false;
}
