/**
 * Urgency Scorer - business-risk based urgency calculation.
 *
 * Pure function of the message text: no Date, no randomness, no I/O. The
 * same message always returns the same result, so a support lead can
 * audit why a ticket sat at a given priority regardless of when it was
 * (re-)scored.
 *
 * Scoring model: each risk category below is checked independently against
 * the message text. If any of its patterns match, its fixed weight is
 * added to the score once (matching twice in the same category doesn't
 * double-count). Tone (capitalization, exclamation marks) only ever adds a
 * small, capped bonus on top - it can never be a primary driver on its
 * own. A message with no reported problem but positive/grateful language
 * is capped low so praise can never outrank a real issue.
 *
 * security, dataLoss, outage, and legalThreat are weighted at the High
 * threshold on their own: a confirmed breach, data loss, outage, or legal
 * threat is P1 by itself and shouldn't need a corroborating signal to be
 * believed. Every other category is weighted below threshold and only
 * reaches High in combination with something else.
 */

const SIGNAL_DEFINITIONS = [
  {
    id: 'security',
    label: 'Security exposure',
    weight: 50,
    patterns: [
      /security vulnerab\w*/i,
      /vulnerabilit\w*/i,
      /data breach/i,
      /\bbreach(ed)?\b/i,
      /\bhack(ed)?\b/i,
      /unauthorized access/i,
      /\bleak(ed|ing)?\b/i,
      /\bexploit(ed)?\b/i,
      /expos(ed|ing|ure)/i,
      /account takeover/i,
      /password reset.*(valid|expir)/i,
    ],
  },
  {
    id: 'dataLoss',
    label: 'Data loss',
    weight: 50,
    patterns: [
      /data loss/i,
      /lost (all|our|my) (of )?(the )?(customer )?data/i,
      /delet(ed|ing) (our|all|my) data/i,
      /(data|database) (is |was |has been )?(corrupt(ed)?|wiped|gone|missing)/i,
    ],
  },
  {
    id: 'outage',
    label: 'Outage / production down',
    weight: 50,
    patterns: [
      /\bdown\b/i,
      /\boutage\b/i,
      /unreachable/i,
      /inaccessible/i,
      /not responding/i,
      /cannot access/i,
      /can'?t access/i,
      /\b(500|502|503)\b.*error/i,
      /connection lost/i,
      /completely down/i,
      /\bfailing\b/i,
      /stopped (working|authenticating|responding)/i,
    ],
  },
  {
    id: 'blockedUsers',
    label: 'Users blocked / locked out',
    weight: 35,
    patterns: [
      /can'?t log ?in/i,
      /cannot log ?in/i,
      /locked out/i,
      /unable to (access|log ?in)/i,
      /none of (my|our) (team|customers|users) can (access|log ?in)/i,
    ],
  },
  {
    id: 'productionImpact',
    label: 'Production / revenue impact',
    weight: 30,
    patterns: [
      /\bproduction\b/i,
      /checkout (flow|process|page)/i,
      /losing (sales|revenue|money|customers)/i,
      /can'?t (checkout|complete (my|our) purchase)/i,
      /entire (checkout|platform|system|site|app)/i,
      /every (transaction|order|purchase)/i,
    ],
  },
  {
    id: 'legalThreat',
    label: 'Legal threat',
    weight: 50,
    patterns: [
      /attorney/i,
      /lawyer/i,
      /legal action/i,
      /lawsuit/i,
      /\bsue\b/i,
      /pursu(e|ing) legal/i,
    ],
  },
  {
    id: 'churn',
    label: 'Churn risk',
    weight: 25,
    patterns: [
      /cancel\w* (my|our) (account|subscription|contract)/i,
      /switch(ing)? to a competitor/i,
      /evaluat(e|ing) competitors/i,
      /terminat(e|ing) (the |our )?contract/i,
      /won'?t (be )?renew(ing)?/i,
      /\bi'?m done\b/i,
    ],
  },
  {
    id: 'paymentFailure',
    label: 'Payment failure',
    weight: 28,
    patterns: [
      /payment (processor|system) is failing/i,
      /payments? (failed|failing)/i,
      /overcharg(ed|ing)/i,
      /double.?charged/i,
      /charged (me |us )?(three times|twice|multiple times|incorrectly)/i,
      /billing error/i,
      /credit card (declin|fail)/i,
    ],
  },
  {
    id: 'blastRadius',
    label: 'Wide blast radius',
    weight: 18,
    patterns: [
      /all (of )?(our |my )?(users|customers|regions|servers|systems)/i,
      /every (user|customer|integration)/i,
      /entire team/i,
      /none of (my|our) (team|users|customers)/i,
      /\beveryone\b/i,
      /whole company/i,
    ],
  },
  {
    id: 'repeatContact',
    label: 'Repeat contact / escalation history',
    weight: 15,
    patterns: [
      /(second|third|fourth) time/i,
      /this keeps happening/i,
      /still (not|hasn'?t been) fixed/i,
      /already (reported|mentioned|told you)/i,
      /reported this (before|already)/i,
      /third outage this month/i,
    ],
  },
  {
    id: 'plainDefect',
    label: 'Plain defect / bug report',
    weight: 22,
    patterns: [
      /\bbug\b/i,
      /doesn'?t work/i,
      /not working/i,
      /\bbroken\b/i,
      /\berrors?\b/i,
      /\bissue\b/i,
      /(?<!no )\bproblem\b/i,
      /\bwrong\b/i,
      /incorrect/i,
      /misaligned/i,
      /glitch/i,
    ],
  },
  {
    id: 'degradedPerformance',
    label: 'Degraded performance',
    weight: 14,
    patterns: [
      /\bslow\b/i,
      /lagg(y|ing)/i,
      /timing out/i,
      /time ?out/i,
      /\bdelayed\b/i,
      /intermittent/i,
      /slower than usual/i,
    ],
  },
  {
    id: 'explicitUrgency',
    label: 'Explicit urgency language',
    weight: 10,
    patterns: [
      /\burgent\b/i,
      /\basap\b/i,
      /\bimmediately\b/i,
      /\bcritical\b/i,
      /\bemergency\b/i,
      /right away/i,
      /right now/i,
    ],
  },
]

const POSITIVE_PATTERNS = [
  /\bhappy\b/i,
  /\blove\b/i,
  /\bgreat\b/i,
  /\bexcellent\b/i,
  /\bwonderful\b/i,
  /\bfantastic\b/i,
  /\bamazing\b/i,
  /\bthanks?\b/i,
  /\bappreciate\b/i,
  /\bkindly\b/i,
]

const HIGH_THRESHOLD = 50
const MEDIUM_THRESHOLD = 20
const PRAISE_CAP = 5
const TONE_CAP = 8

/**
 * Score a message's urgency from its content.
 *
 * @param {string} message
 * @returns {{ level: 'High'|'Medium'|'Low', score: number, signals: Array<{id: string, label: string, weight: number, phrase?: string, note?: string}> }}
 */
export function scoreUrgency(message) {
  const raw = typeof message === 'string' ? message : String(message ?? '')
  // Normalize smart quotes from pasted email/Word/Notes content so
  // apostrophe-sensitive patterns (doesn't, can't, won't...) still match.
  const text = raw.replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  const signals = []
  let score = 0

  for (const def of SIGNAL_DEFINITIONS) {
    let phrase = null
    for (const pattern of def.patterns) {
      const match = text.match(pattern)
      if (match) {
        phrase = match[0]
        break
      }
    }
    if (phrase) {
      score += def.weight
      signals.push({ id: def.id, label: def.label, weight: def.weight, phrase })
    }
  }

  // A bare claim of urgency with no other risk signal is easy to game
  // ("URGENT!!! my export is 3 seconds slower") and shouldn't be trusted
  // on its own - discount it unless it rides along with a real problem.
  if (signals.length === 1 && signals[0].id === 'explicitUrgency') {
    signals[0].weight = 0
    signals[0].note = 'discounted: no accompanying problem signal'
    score = 0
  }

  // Tone amplifier: shouting and punctuation nudge the score slightly,
  // but are capped so they can never be a primary driver by themselves.
  const exclamationCount = (text.match(/!/g) || []).length
  const isShouting = text.length > 10 && text === text.toUpperCase()
  const toneBonus = Math.min(exclamationCount * 2 + (isShouting ? 4 : 0), TONE_CAP)
  if (toneBonus > 0) {
    score += toneBonus
    signals.push({ id: 'tone', label: 'Tone amplifier (caps/punctuation)', weight: toneBonus })
  }

  // Praise with no reported problem is capped so it can never outrank a
  // real issue, no matter how enthusiastic the tone. If a problem signal
  // fired (e.g. "thank you for your help, but production is down"), this
  // never applies - the problem drives the score, not the gratitude.
  const hasProblemSignal = signals.some(s => s.id !== 'tone' && s.weight > 0)
  const hasPositiveLanguage = POSITIVE_PATTERNS.some(p => p.test(text))
  if (!hasProblemSignal && hasPositiveLanguage) {
    const cappedScore = Math.min(score, PRAISE_CAP)
    if (cappedScore < score) {
      signals.push({
        id: 'praiseCap',
        label: 'Praise cap applied (no reported problem)',
        weight: cappedScore - score,
      })
      score = cappedScore
    }
  }

  const level = score >= HIGH_THRESHOLD ? 'High' : score >= MEDIUM_THRESHOLD ? 'Medium' : 'Low'

  return { level, score, signals }
}

/**
 * @param {string} message
 * @returns {'High'|'Medium'|'Low'}
 */
export function calculateUrgency(message) {
  return scoreUrgency(message).level
}
