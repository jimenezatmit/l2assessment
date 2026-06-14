/**
 * Rule-based urgency scoring based on customer impact and operational risk.
 */

const CRITICAL_PATTERNS = [
  /\b(production|prod)\b.*\b(down|offline|unavailable|outage)\b/,
  /\b(server|service|system|website|app|database)\b.*\b(down|offline|unavailable|outage|lost)\b/,
  /\b(down|offline|unavailable|outage)\b.*\b(server|service|system|website|app|database)\b/,
  /\b(data breach|security breach|account takeover|hacked|compromised)\b/,
  /\b(data loss|lost all (?:my|our) data)\b/,
  /\b(can(?:not|'t) access|locked out of)\b.*\b(account|dashboard|service)\b/,
]

const HIGH_IMPACT_PATTERNS = [
  /\b(blocked|blocking)\b/,
  /\b(can(?:not|'t)|unable to)\b.*\b(log in|login|access|use the (?:app|service|product)|complete (?:checkout|payment)|send|receive)\b/,
  /\b(payment failed|duplicate charge|charged twice|unauthorized charge)\b/,
  /\b(crash|crashing|critical|emergency|urgent)\b/,
  /\b(all users|every user|entire team|customers)\b.*\b(affected|blocked|unable|cannot|can't)\b/,
]

const DEGRADED_SERVICE_PATTERNS = [
  /\b(error|bug|broken|not working|tim(?:e|ed) out|timeout|failed)\b/,
  /\b(slow|loading forever|intermittent|degraded)\b/,
]

const LOW_URGENCY_PATTERNS = [
  /\b(feature request|suggestion|would like to see|would be great|could you add|please add)\b/,
  /\b(thank you|thanks|appreciate|love|great job|positive feedback)\b/,
  /\b(what are|how do|how can|where can|when is|can i|is there)\b/,
]

function matchesAny(message, patterns) {
  return patterns.some(pattern => pattern.test(message))
}

export function calculateUrgency(message) {
  const normalizedMessage = message.trim().toLowerCase()

  if (!normalizedMessage) return "Low"

  if (matchesAny(normalizedMessage, CRITICAL_PATTERNS)) {
    return "High"
  }

  if (matchesAny(normalizedMessage, HIGH_IMPACT_PATTERNS)) {
    return "High"
  }

  if (matchesAny(normalizedMessage, DEGRADED_SERVICE_PATTERNS)) {
    return "Medium"
  }

  if (matchesAny(normalizedMessage, LOW_URGENCY_PATTERNS)) {
    return "Low"
  }

  return "Medium"
}
