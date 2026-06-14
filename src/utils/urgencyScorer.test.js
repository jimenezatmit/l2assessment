import test from 'node:test'
import assert from 'node:assert/strict'

import { calculateUrgency } from './urgencyScorer.js'

const cases = [
  ['Database connection lost', 'High'],
  ['Server down now', 'High'],
  ['Our production app is unavailable for every customer', 'High'],
  ["I can't access my account after my payment failed", 'High'],
  ['The dashboard is loading very slowly', 'Medium'],
  ['Could you add an export to CSV feature?', 'Low'],
  ['What are your business hours?', 'Low'],
  ['Thank you so much! Your team has been incredibly helpful!', 'Low'],
]

for (const [message, expectedUrgency] of cases) {
  test(`returns ${expectedUrgency} for "${message}"`, () => {
    assert.equal(calculateUrgency(message), expectedUrgency)
  })
}
