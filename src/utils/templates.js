/**
 * Recommendation Templates - routes (category x urgency) to an owning
 * team, priority, and SLA, and decides whether a ticket needs a human.
 */

import { scoreUrgency } from './urgencyScorer'

// Priority tiers: P1 = drop everything, P2 = same business day,
// P3 = normal queue, P4 = backlog.
const ROUTING = {
  'Billing Issue': {
    High: {
      team: 'Billing & Finance',
      priority: 'P1',
      sla: '1 business hour',
      action: 'Escalate directly to a billing specialist - do not send to the self-serve billing portal.',
    },
    Medium: {
      team: 'Billing & Finance',
      priority: 'P2',
      sla: '1 business day',
      action: 'Route to the billing queue for review of the charge or invoice in question.',
    },
    Low: {
      team: 'Billing & Finance',
      priority: 'P4',
      sla: '3 business days',
      action: 'Point the customer to the billing portal for self-serve account/invoice lookup.',
    },
  },
  'Technical Problem': {
    High: {
      team: 'Engineering On-Call',
      priority: 'P1',
      sla: '15 minutes',
      action: 'Page on-call engineering immediately - treat as a potential outage until ruled out.',
    },
    Medium: {
      team: 'Technical Support (Tier 2)',
      priority: 'P2',
      sla: '4 business hours',
      action: 'Assign to Tier 2 support for reproduction and triage.',
    },
    Low: {
      team: 'Technical Support (Tier 1)',
      priority: 'P4',
      sla: '2 business days',
      action: 'Log as a minor defect; suggest standard troubleshooting steps.',
    },
  },
  'Feature Request': {
    High: {
      team: 'Product Management',
      priority: 'P2',
      sla: '1 business day',
      action: 'Urgency is likely driven by a retention risk rather than the feature itself - loop in account management.',
    },
    Medium: {
      team: 'Product Management',
      priority: 'P3',
      sla: '5 business days',
      action: 'Log in the product backlog for prioritization review.',
    },
    Low: {
      team: 'Product Management',
      priority: 'P4',
      sla: '10 business days',
      action: 'Log in the product backlog for prioritization review.',
    },
  },
  'General Inquiry': {
    High: {
      team: 'Customer Support (Tier 1)',
      priority: 'P2',
      sla: '4 business hours',
      action: 'Respond promptly; escalate to Tier 2 if the question turns out to mask a real issue.',
    },
    Medium: {
      team: 'Customer Support (Tier 1)',
      priority: 'P3',
      sla: '1 business day',
      action: 'Respond with the relevant FAQ or documentation link.',
    },
    Low: {
      team: 'Customer Support (Tier 1)',
      priority: 'P4',
      sla: '2 business days',
      action: 'Respond with the relevant FAQ or documentation link.',
    },
  },
  Unknown: {
    High: {
      team: 'Support Lead (manual triage)',
      priority: 'P1',
      sla: '30 minutes',
      action: 'Category could not be determined for a high-urgency message - route to a human immediately rather than guessing.',
    },
    Medium: {
      team: 'Support Lead (manual triage)',
      priority: 'P2',
      sla: '4 business hours',
      action: 'Category could not be determined - needs manual review.',
    },
    Low: {
      team: 'Support Lead (manual triage)',
      priority: 'P3',
      sla: '2 business days',
      action: 'Category could not be determined - needs manual review.',
    },
  },
}

const CONFIDENCE_ESCALATION_THRESHOLD = 0.5

/**
 * Get the recommended routing for a given category and urgency.
 *
 * @param {string} category - The message category
 * @param {string} urgency - The urgency level ('High'|'Medium'|'Low')
 * @returns {{ team: string, priority: string, sla: string, action: string, category: string, urgency: string }}
 */
export function getRecommendedAction(category, urgency) {
  const byCategory = ROUTING[category] || ROUTING.Unknown
  const routing = byCategory[urgency] || byCategory.Medium
  return { ...routing, category, urgency }
}

/**
 * Get all available categories.
 *
 * @returns {string[]} - List of categories
 */
export function getAvailableCategories() {
  return Object.keys(ROUTING)
}

/**
 * Decide whether a ticket needs a human instead of the automated
 * recommendation, and why. Every reason is returned so the decision is
 * auditable by a support lead, not a black box.
 *
 * @param {object} params
 * @param {string} params.category - The message category
 * @param {string} params.urgency - The urgency level ('High'|'Medium'|'Low')
 * @param {string} [params.message] - The original message (used to re-derive
 *   risk signals if params.urgencySignals isn't already available)
 * @param {Array} [params.urgencySignals] - signals[] from scoreUrgency(message),
 *   if already computed by the caller, to avoid re-scoring
 * @param {number} [params.confidence] - classifier confidence in [0, 1]
 * @param {boolean} [params.degraded] - true if the AI categorization ran in
 *   fallback/degraded mode
 * @returns {{ escalate: boolean, reasons: string[] }}
 */
export function shouldEscalate({
  category,
  urgency,
  message,
  urgencySignals,
  confidence = 1,
  degraded = false,
} = {}) {
  const signals = urgencySignals || (message ? scoreUrgency(message).signals : [])
  const reasons = []

  if (urgency === 'High') {
    reasons.push('Urgency scored High.')
  }

  if (signals.some(s => s.id === 'security' && s.weight > 0)) {
    reasons.push('Message contains a security-exposure signal.')
  }

  if (signals.some(s => s.id === 'legalThreat' && s.weight > 0)) {
    reasons.push('Message contains a legal threat.')
  }

  if (signals.some(s => s.id === 'churn' && s.weight > 0)) {
    reasons.push('Message contains churn/cancellation language.')
  }

  if (typeof confidence === 'number' && confidence < CONFIDENCE_ESCALATION_THRESHOLD) {
    reasons.push(`Classifier confidence is low (${Math.round(confidence * 100)}%).`)
  }

  if (degraded) {
    reasons.push('AI categorization is running in degraded/fallback mode.')
  }

  if (category === 'Unknown') {
    reasons.push('Category could not be determined.')
  }

  return { escalate: reasons.length > 0, reasons }
}
