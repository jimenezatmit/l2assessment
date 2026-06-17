/**
 * Recommendation & Routing Templates.
 *
 * Maps a category (and its urgency) to the team that should own it and a concrete
 * next step. Replaces the previous table, which mis-routed Feature Requests to the
 * billing portal and recommended "restart your browser" for every technical issue.
 */

import { hasCriticalSignal } from './urgencyScorer.js'

const ROUTING = {
  'Billing Issue': {
    team: 'Billing & Accounts',
    action:
      'Pull up the customer’s account and recent charges in the billing portal, then confirm the specific invoice, plan, or transaction in question.',
  },
  'Technical Problem': {
    team: 'Technical Support',
    action:
      'Ask for steps to reproduce, environment, and a screenshot or error message; check the status page for a known incident before replying.',
  },
  'Feature Request': {
    team: 'Product',
    action:
      'Log the request in the product backlog and acknowledge the customer with realistic expectations. No immediate support action required.',
  },
  'General Inquiry': {
    team: 'Front-line Support',
    action:
      'Answer directly or share the relevant help-center article — a good candidate for a templated or self-serve reply.',
  },
  Unknown: {
    team: 'Front-line Support',
    action: 'Unclear intent — have a human read the message and route it manually.',
  },
}

// When urgency is High, the routine next step isn't enough — these take over.
const HIGH_PRIORITY_ACTIONS = {
  'Technical Problem':
    'Open an incident and page the on-call engineer — this reads as service-impacting, not a routine ticket.',
  'Billing Issue':
    'Fast-track to a billing specialist — the customer appears blocked from paying or from a feature they’ve paid for.',
}

/**
 * Recommended next step for a category, sharpened when urgency is High.
 *
 * @param {string} category
 * @param {string} [urgency]
 * @returns {string}
 */
export function getRecommendedAction(category, urgency) {
  if (urgency === 'High' && HIGH_PRIORITY_ACTIONS[category]) {
    return HIGH_PRIORITY_ACTIONS[category]
  }
  return (ROUTING[category] || ROUTING.Unknown).action
}

/**
 * The team / queue a message should be routed to.
 *
 * @param {string} category
 * @returns {string}
 */
export function getRoutedTeam(category) {
  return (ROUTING[category] || ROUTING.Unknown).team
}

/**
 * @returns {string[]} all known categories
 */
export function getAvailableCategories() {
  return Object.keys(ROUTING)
}

/**
 * Whether a message needs immediate human attention rather than the normal queue.
 * Based on urgency and critical content — not message length.
 *
 * @param {string} category
 * @param {string} urgency
 * @param {string} message
 * @returns {boolean}
 */
export function shouldEscalate(category, urgency, message = '') {
  if (urgency === 'High') return true
  return hasCriticalSignal(message)
}
