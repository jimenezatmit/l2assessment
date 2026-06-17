/**
 * Triage pipeline tests (heuristic / no-API-key path).
 *
 * Exercises the real triageMessage() so category, urgency, routing and escalation
 * are validated together. With no VITE_GROQ_API_KEY set, triageMessage() runs the
 * local heuristic — fully deterministic, so these assertions are stable.
 *
 *   npm test   (or: node tests/triage.test.mjs)
 *
 * Exits non-zero if any case fails.
 */
import { triageMessage } from '../src/utils/llmHelper.js'

const cases = [
  // --- documented problem cases from sample-messages.json (previously wrong) ---
  { msg: 'Database connection lost', cat: 'Technical Problem', urg: 'High', esc: true },
  { msg: 'Server down now', cat: 'Technical Problem', urg: 'High', esc: true },
  { msg: 'Our production server is down', cat: 'Technical Problem', urg: 'High', esc: true },
  { msg: "My payment failed and now I can't access the dashboard. Is there a bug or do I need to update my credit card?", cat: 'Billing Issue', urg: 'High', esc: true },
  { msg: 'Could you add an export to CSV feature? Would be really useful for my monthly reports.', cat: 'Feature Request', urg: 'Low', esc: false },
  { msg: 'Thank you so much! Your team has been incredibly helpful and I really appreciate the fast response to my question earlier today!', cat: 'General Inquiry', urg: 'Low', esc: false },
  { msg: 'Hi! I was just browsing your site and noticed the design is really nice! Love the colors! So clean! Just wanted to share positive feedback!', cat: 'General Inquiry', urg: 'Low', esc: false },
  { msg: 'What are your business hours?', cat: 'General Inquiry', urg: 'Low', esc: false },
  // --- new examples (regression / coverage) ---
  { msg: 'URGENT: customers cannot checkout, we are losing sales every minute', cat: 'Technical Problem', urg: 'High', esc: true },
  { msg: "I want a refund and I'm cancelling — switching to a competitor", cat: 'Billing Issue', urg: 'Medium', esc: false },
  { msg: 'We think our customer data was exposed in a breach', cat: 'Technical Problem', urg: 'High', esc: true },
  { msg: 'Can I upgrade my subscription to the pro plan?', cat: 'Billing Issue', urg: 'Low', esc: false },
  { msg: 'The dashboard is loading very slowly today', cat: 'Technical Problem', urg: 'Medium', esc: false },
  { msg: 'Would love to see a dark mode option in the app', cat: 'Feature Request', urg: 'Low', esc: false },
]

const pad = (s, n) => String(s).padEnd(n)
let pass = 0
const fails = []

console.log(pad('CAT', 6) + pad('URG', 6) + pad('ESC', 6) + 'RESULT\n' + '-'.repeat(96))
for (const c of cases) {
  const r = await triageMessage(c.msg)
  const okCat = r.category === c.cat
  const okUrg = r.urgency === c.urg
  const okEsc = r.escalate === c.esc
  const ok = okCat && okUrg && okEsc
  if (ok) pass++
  else fails.push({ c, r })
  console.log(
    pad(okCat ? 'ok' : 'X', 6) + pad(okUrg ? 'ok' : 'X', 6) + pad(okEsc ? 'ok' : 'X', 6) +
    `${ok ? '✓' : '✗'} [${r.category} / ${r.urgency} / esc=${r.escalate} → ${r.routedTeam}] ${JSON.stringify(c.msg.slice(0, 42))}`
  )
}

console.log('-'.repeat(96))
console.log(`\nPASS ${pass}/${cases.length}`)
if (fails.length) {
  console.log('\nFAILURES:')
  for (const f of fails) {
    console.log(`  msg: ${JSON.stringify(f.c.msg.slice(0, 60))}`)
    console.log(`    expected: ${f.c.cat} / ${f.c.urg} / esc=${f.c.esc}`)
    console.log(`    got:      ${f.r.category} / ${f.r.urgency} / esc=${f.r.escalate}`)
  }
  process.exit(1)
}
