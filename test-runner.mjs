import { calculateUrgency } from './src/utils/urgencyScorer.js';
import { getRecommendedAction, shouldEscalate } from './src/utils/templates.js';

const samples = [
  {
    name: 'Production down',
    message: 'OUR PRODUCTION SERVER IS DOWN! The dashboard is 503 and customers cannot access the app.'
  },
  {
    name: 'Payment failed',
    message: 'I tried to update my payment method but it keeps failing and my subscription is about to expire.'
  },
  {
    name: 'Feature request',
    message: 'Would love a dark mode. It would help when using at night.'
  },
  {
    name: 'Positive feedback',
    message: 'Thanks! Your support team is wonderful and the product works great.'
  },
  {
    name: 'Short urgent',
    message: 'Server down!'
  }
]

for (const s of samples) {
  const urgency = calculateUrgency(s.message)
  const categoryGuess = (() => {
    const m = s.message.toLowerCase()
    if (m.includes('payment') || m.includes('subscription') || m.includes('invoice') || m.includes('refund')) return 'Billing Issue'
    if (m.includes('feature') || m.includes('dark mode') || m.includes('would love')) return 'Feature Request'
    if (m.includes('server') || m.includes('production') || m.includes('dashboard') || m.includes('error') || m.includes('down')) return 'Technical Problem'
    if (m.includes('thank') || m.includes('thanks') || m.includes('great')) return 'General Inquiry'
    return 'Unknown'
  })()
  const action = getRecommendedAction(categoryGuess, urgency)
  const escalate = shouldEscalate(categoryGuess, urgency, s.message)

  console.log('---')
  console.log('Sample:', s.name)
  console.log('Message:', s.message)
  console.log('Category (heuristic):', categoryGuess)
  console.log('Urgency:', urgency)
  console.log('Recommended action:', action)
  console.log('Should escalate?', escalate)
}
