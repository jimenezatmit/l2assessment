const CRITICAL_SIGNALS = ['outage', 'down', 'locked out', 'data loss', 'breach', 'emergency', 'urgent', 'asap'];
const HIGH_SIGNALS = ['not working', 'broken', 'error', 'crash', 'failed', 'cancel', 'refund', 'charged twice'];
const LOW_SIGNALS = ['suggestion', 'feature', 'would love', 'how do i', 'thank', 'thanks'];

export function calculateUrgency(message) {
  const m = message.toLowerCase();
  if (CRITICAL_SIGNALS.some(s => m.includes(s))) return "Critical";
  if (HIGH_SIGNALS.some(s => m.includes(s))) return "High";
  if (LOW_SIGNALS.some(s => m.includes(s))) return "Low";
  return "Medium";
}

const CHURN_RISK_SIGNALS = [
  'switching', 'switch to', 'competitor', 'other options',
  'cancel', 'cancelling', 'canceling',
  "why are we still paying", "why we're still paying", 'not worth it',
  'looking elsewhere', 'considering other', 'thinking about leaving'
];

const BUSINESS_IMPACT_SIGNALS = [
  'client presentation', 'production', 'entire team', 'all our customers',
  'stuck', 'orders', 'deadline', 'losing money', 'contract'
];

// Runs independently of calculateUrgency so a mild or miscategorized
// urgency reading can't silently suppress escalation for a high-risk message.
export function detectEscalationRisk(message) {
  const m = message.toLowerCase();
  const churnRisk = CHURN_RISK_SIGNALS.some(s => m.includes(s));
  const businessImpact = BUSINESS_IMPACT_SIGNALS.some(s => m.includes(s));
  return churnRisk || businessImpact;
}