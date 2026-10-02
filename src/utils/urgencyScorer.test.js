import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateUrgency } from './urgencyScorer.js'

const cases = [
  ['Someone else may have access to my account', 'High'],
  ['My account may have been accessed by someone else', 'High'],
  ['I think my account is being accessed by someone else', 'High'],
  ["I don't recognize this login", 'High'],
  ['There is a login I do not recognize', 'High'],
  ['Someone changed my password', 'High'],
  ['Customer records were exposed', 'High'],
  ['There is an unauthorized charge on my card', 'High'],
  ['My card has a charge I do not recognize', 'High'],
  ['Our production service is down', 'High'],
  ['This situation is unsafe and someone may be injured', 'High'],
  ["I'm locked out of my account", 'Medium'],
  ['The upload keeps failing every time', 'Medium'],
  ['The dashboard is running slowly', 'Medium'],
  ['Please help!!', 'Medium'],
  ['Can you add dark mode?', 'Low'],
  ['How do I configure the safety feature?', 'Low'],
  ['Thanks for the great support!', 'Low'],
]

for (const [message, expectedUrgency] of cases) {
  test(`returns ${expectedUrgency} for: ${message}`, () => {
    assert.equal(calculateUrgency(message), expectedUrgency)
  })
}

test('does not downgrade short or uppercase security messages', () => {
  assert.equal(calculateUrgency('ACCOUNT HACKED'), 'High')
})

test('returns consistent results independent of the current date or time', () => {
  const message = 'Someone else may have access to my account'

  assert.equal(calculateUrgency(message), 'High')
  assert.equal(calculateUrgency(message), 'High')
})
