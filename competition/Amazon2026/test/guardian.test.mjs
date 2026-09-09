import test from 'node:test'
import assert from 'node:assert/strict'
import { buildGuardianPlan, detectPortals, judgeScenario, requiresApproval } from '../src/guardian-core.mjs'

test('judge scenario coordinates multiple portals from one request', () => {
  const result = judgeScenario()
  assert.equal(result.metrics.userRequestsRequired, 1)
  assert.ok(result.portals.length >= 5)
  assert.equal(result.metrics.unsafeAutomaticActions, 0)
})

test('external actions trigger an approval boundary', () => {
  assert.equal(requiresApproval('Send the stylist a message and change the home temperature'), true)
  const result = buildGuardianPlan('Send the stylist a message and change the home temperature')
  assert.equal(result.approvalRequired, true)
  assert.equal(result.state, 'prepared_for_approval')
})

test('portal routing activates only relevant domains', () => {
  const portals = detectPortals('My investor pitch is late and my anniversary dinner is at eight')
  assert.ok(portals.includes('Work'))
  assert.ok(portals.includes('Relationships'))
  assert.equal(portals.includes('Home'), false)
})
