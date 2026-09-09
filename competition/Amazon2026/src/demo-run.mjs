import { judgeScenario } from './guardian-core.mjs'

const scenario = judgeScenario()

console.log('\nSTAARWAARDD GUARDIAN — AMAZON 2026 JUDGE SCENARIO\n')
console.log(`Request: ${scenario.request}\n`)

for (const [index, line] of scenario.narration.entries()) {
  console.log(`${index + 1}. ${line}`)
}

console.log('\nJUDGE-VISIBLE METRICS')
console.log(JSON.stringify(scenario.metrics, null, 2))
console.log('\nAPPROVAL STATE')
console.log(JSON.stringify({ approvalRequired: scenario.approvalRequired, state: scenario.state, outcome: scenario.outcome }, null, 2))
