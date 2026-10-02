/**
 * Urgency Scorer - Risk-aware urgency calculation
 */

const highRiskPatterns = [
  /(?:hacked|compromised|account takeover)/,
  /(?:production|prod|service|system|server|site|website).*(?:down|outage|offline|unavailable)/,
  /(?:down|outage|offline|unavailable).*(?:production|prod|service|system|server|site|website)/,
  /(?:all users|every user|everyone|entire service|system[ -]wide).*(?:affected|down|failing|outage|unavailable)/,
]

const unauthorizedActorPattern = /(?:someone else|somebody else|another person|unknown (?:person|user)|not me|without my permission|do not recognize|don't recognize|cannot recognize|can't recognize)/
const accountActivityPattern = /(?:account|access|accessed|login|log in|logged in|sign in|signed in|session|device|password|credentials?)/
const suspiciousAccountChangePattern = /(?:someone|somebody|another person|unknown (?:person|user)).*(?:changed|reset|stole).*(?:password|credentials?|email)/
const recognitionConcernPattern = /(?:do not recognize|don't recognize|cannot recognize|can't recognize|unrecognized|unauthori[sz]ed|suspicious)/
const financialActivityPattern = /(?:charge|charged|payment|purchase|transaction|card)/
const sensitiveDataPattern = /(?:data|customer information|personal information|records?)/
const exposurePattern = /(?:breach|leak|leaked|exposed|publicly accessible)/
const safetyIncidentPattern = /(?:injur(?:y|ed)|hurt|harmed|threatened|threatening|in danger|immediate danger|unsafe situation|physical safety|safety (?:incident|risk|issue|concern))/

const mediumRiskPatterns = [
  /(?:account|user).*(?:locked|lockout)/,
  /locked out(?: of (?:my|the) account)?/,
  /(?:locked out|cannot|can't|unable to).*(?:log in|login|sign in|access (?:my|the) account)/,
  /(?:keeps?|repeatedly|every time|still).*(?:fail|failing|error|broken|not working)/,
  /(?:slow|latency|timeout|timing out|performance degradation)/,
  /(?:error|broken|not working|cannot|can't|unable to|fail|failing)/,
]

const urgentLanguagePattern = /(?:urgent|immediately|as soon as possible|asap|critical)/
const problemLanguagePattern = /(?:issue|problem|error|fail|broken|not working|cannot|can't|unable|help)/

export function calculateUrgency(message) {
  const normalizedMessage = message.toLowerCase().replace(/\s+/g, ' ').trim()

  const hasAccountSecurityRisk =
    unauthorizedActorPattern.test(normalizedMessage) && accountActivityPattern.test(normalizedMessage) ||
    suspiciousAccountChangePattern.test(normalizedMessage)
  const hasFraudRisk =
    /(?:fraud|fraudulent)/.test(normalizedMessage) ||
    recognitionConcernPattern.test(normalizedMessage) && financialActivityPattern.test(normalizedMessage)
  const hasDataExposureRisk =
    sensitiveDataPattern.test(normalizedMessage) && exposurePattern.test(normalizedMessage)

  if (hasAccountSecurityRisk || hasFraudRisk || hasDataExposureRisk ||
      safetyIncidentPattern.test(normalizedMessage) ||
      highRiskPatterns.some(pattern => pattern.test(normalizedMessage))) {
    return 'High'
  }

  if (mediumRiskPatterns.some(pattern => pattern.test(normalizedMessage))) {
    return 'Medium'
  }

  const hasUrgentLanguage = urgentLanguagePattern.test(normalizedMessage)
  const hasProblemLanguage = problemLanguagePattern.test(normalizedMessage)
  const hasRepeatedEmphasis = (message.match(/!/g) || []).length >= 2

  if (hasProblemLanguage && (hasUrgentLanguage || hasRepeatedEmphasis)) {
    return 'Medium'
  }

  return 'Low'
}
