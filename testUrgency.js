import { calculateUrgency } from './src/utils/urgencyScorer.js'

const messages = [
  "Our production server is down",
  "I was charged twice and I am furious!!",
  "Thank you so much, your team is great!",
  "Can I upgrade to the pro plan?",
  "URGENT: I cannot log in and I have a demo in 10 minutes"
]

for (const message of messages) {
  console.log(`${calculateUrgency(message)}\t${message}`)
}
