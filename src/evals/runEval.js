/**
 * Evaluation harness for the rule-based urgency scorer.
 *
 * Runs the golden set through the CURRENT calculateUrgency implementation
 * and reports overall accuracy, a confusion matrix, critical recall, and
 * every individual failure. Exits non-zero if either headline metric is
 * below threshold, so this can gate CI.
 *
 * NOTE: calculateUrgency reads `new Date()` internally (day-of-week and
 * hour-of-day both shift the score). It is not a pure function of its
 * input message, so the numbers below can change depending on when this
 * is run - that instability is itself one of the findings, not a bug in
 * this harness. See goldenSet.js for label definitions.
 *
 * Usage: node src/evals/runEval.js
 */

import { calculateUrgency } from '../utils/urgencyScorer.js'
import { goldenSet } from './goldenSet.js'

const LABELS = ['High', 'Medium', 'Low']
const MIN_ACCURACY = 0.75
const MIN_CRITICAL_RECALL = 0.9

function buildConfusionMatrix(results) {
  const matrix = {}
  for (const expected of LABELS) {
    matrix[expected] = {}
    for (const actual of LABELS) {
      matrix[expected][actual] = 0
    }
  }
  for (const r of results) {
    matrix[r.expectedUrgency][r.actualUrgency] += 1
  }
  return matrix
}

function printConfusionMatrix(matrix) {
  console.log('\nConfusion matrix (rows = expected, columns = predicted):\n')
  const header = ['expected \\ actual', ...LABELS]
  const rows = LABELS.map(expected => [
    expected,
    ...LABELS.map(actual => String(matrix[expected][actual])),
  ])
  const colWidths = header.map((h, i) =>
    Math.max(h.length, ...rows.map(r => r[i].length))
  )
  const formatRow = row =>
    row.map((cell, i) => cell.padEnd(colWidths[i])).join('  ')
  console.log(formatRow(header))
  console.log(colWidths.map(w => '-'.repeat(w)).join('  '))
  rows.forEach(row => console.log(formatRow(row)))
}

function runEval() {
  const results = goldenSet.map(item => {
    const actualUrgency = calculateUrgency(item.message)
    return {
      ...item,
      actualUrgency,
      correct: actualUrgency === item.expectedUrgency,
    }
  })

  const total = results.length
  const correctCount = results.filter(r => r.correct).length
  const accuracy = correctCount / total

  const trueHigh = results.filter(r => r.expectedUrgency === 'High')
  const caughtHigh = trueHigh.filter(r => r.actualUrgency === 'High')
  const criticalRecall = trueHigh.length > 0 ? caughtHigh.length / trueHigh.length : null

  const failures = results.filter(r => !r.correct)
  const matrix = buildConfusionMatrix(results)

  console.log('=== Triage Urgency Scorer Evaluation ===')
  console.log(`Golden set size: ${total}`)
  console.log(`Run at: ${new Date().toString()} (see note above on non-determinism)\n`)

  console.log(`Overall accuracy: ${correctCount}/${total} (${(accuracy * 100).toFixed(1)}%)`)
  console.log(
    `Critical recall (true-High caught as High): ${caughtHigh.length}/${trueHigh.length} ` +
    `(${trueHigh.length > 0 ? (criticalRecall * 100).toFixed(1) : 'n/a'}%)`
  )

  printConfusionMatrix(matrix)

  console.log(`\nFailures (${failures.length}/${total}):\n`)
  if (failures.length === 0) {
    console.log('  none')
  } else {
    failures.forEach(f => {
      const preview = f.message.length > 80 ? f.message.slice(0, 77) + '...' : f.message
      console.log(`  [${f.id}] (${f.tag}) expected=${f.expectedUrgency} actual=${f.actualUrgency}`)
      console.log(`    "${preview}"`)
    })
  }

  console.log('\n=== Gate ===')
  console.log(`Accuracy threshold: ${(MIN_ACCURACY * 100).toFixed(0)}% -> ${accuracy >= MIN_ACCURACY ? 'PASS' : 'FAIL'}`)
  console.log(`Critical recall threshold: ${(MIN_CRITICAL_RECALL * 100).toFixed(0)}% -> ${criticalRecall >= MIN_CRITICAL_RECALL ? 'PASS' : 'FAIL'}`)

  const passed = accuracy >= MIN_ACCURACY && criticalRecall >= MIN_CRITICAL_RECALL
  if (!passed) {
    console.log('\nEVAL FAILED\n')
    process.exitCode = 1
  } else {
    console.log('\nEVAL PASSED\n')
  }
}

runEval()
