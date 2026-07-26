/**
 * Urgency Scorer - Keyword-based urgency calculation for support triage.
 * Uses the reference urgency keyword list and applies the highest matching tier.
 */

const URGENCY_RULES = [
  {
    tier: 'CRITICAL',
    categories: {
      outage: [
        'system down',
        'complete outage',
        'total failure',
        'production is down',
        'site is unreachable',
        "nothing is working",
        "we're offline",
        "can't send emails",
        'notifications not sending'
      ],
      security: [
        'data breach',
        'account hacked',
        'unauthorized access',
        "we've been compromised",
        'ransomware',
        'phishing attack'
      ],
      data: [
        'data loss',
        'all data deleted',
        'database corrupted',
        'backup failed'
      ],
      billing: [
        'revenue loss',
        'losing customers'
      ]
    }
  },
  {
    tier: 'HIGH',
    categories: {
      access: [
        'completely locked out',
        "can't access account",
        'password not working',
        'sso broken'
      ],
      performance: [
        'api not responding',
        'timeouts everywhere',
        '500 errors',
        'crashing repeatedly',
        'extremely slow',
        'not loading at all'
      ],
      billing: [
        'charge incorrect',
        'double charged',
        'subscription cancelled incorrectly',
        'overdue invoice'
      ],
      escalation: [
        'need this fixed now',
        'escalate to manager',
        'this is unacceptable',
        "i'll cancel",
        'switching to competitor',
        'filing a complaint'
      ],
      timePressure: [
        'deadline today',
        'client presentation in 1 hour',
        'going live today',
        'end of day deadline'
      ]
    }
  },
  {
    tier: 'MEDIUM',
    categories: {
      performance: [
        'features not working',
        'intermittent issues',
        'error message',
        'stuck on loading',
        'sync not working',
        'integration broken'
      ],
      access: [
        "team can't log in",
        'permission denied',
        'two-factor not working',
        'account suspended'
      ],
      data: [
        'wrong data showing',
        'report not updating',
        'export not working',
        'import failed'
      ],
      billing: [
        'refund request',
        'invoice wrong'
      ],
      escalation: [
        'been waiting days',
        'no response from support',
        'still not fixed'
      ],
      timePressure: [
        'need this by tomorrow',
        'before the weekend',
        'sla breach'
      ]
    }
  }
]

function findMatches(message) {
  const normalized = message.toLowerCase()
  const matches = []

  for (const rule of URGENCY_RULES) {
    for (const [category, phrases] of Object.entries(rule.categories)) {
      for (const phrase of phrases) {
        if (normalized.includes(phrase)) {
          matches.push({ tier: rule.tier, category, trigger: phrase })
        }
      }
    }
    if (matches.some(match => match.tier === rule.tier)) {
      return matches.filter(match => match.tier === rule.tier)
    }
  }

  return []
}

export function scoreUrgency(message) {
  const matches = findMatches(message)

  if (matches.length > 0) {
    const urgency = matches[0].tier
    const categories = [...new Set(matches.map(match => match.category))]
    const triggers = [...new Set(matches.map(match => match.trigger))]

    const categoryLabel = categories
      .map(cat => {
        if (cat === 'timePressure') return 'Time pressure'
        if (cat === 'access') return 'Access'
        return cat.charAt(0).toUpperCase() + cat.slice(1)
      })
      .join(' + ')

    return {
      urgency,
      urgencyCategory: categoryLabel,
      trigger: triggers.map(trigger => `"${trigger}"`).join(', '),
      reasoning: `Detected ${urgency.toLowerCase()} urgency from keyword(s): ${triggers.join(', ')}.`
    }
  }

  return {
    urgency: 'NORMAL',
    urgencyCategory: 'Normal',
    trigger: 'No matching urgency keywords',
    reasoning: 'No urgency keywords were detected; handle this message through standard queue processing.'
  }
}

export function calculateUrgency(message) {
  return scoreUrgency(message).urgency
}
