import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createDemo, reduceFarm } from './state'
import { currentTask } from './types'
import { parseSnapshot } from './adapters'
import { dayPeriod } from './daylight'

test('farm follows local morning/day/evening/night boundaries', () => {
  for (const [hour, expected] of [[0, 'night'], [4, 'night'], [5, 'morning'], [10, 'morning'], [11, 'day'], [14, 'day'], [15, 'evening'], [17, 'evening'], [18, 'night'], [23, 'night']] as const) {
    assert.equal(dayPeriod(new Date(2026, 10, 1, hour, 0)), expected)
    assert.equal(dayPeriod(new Date(2026, 10, 1, hour, 59)), expected)
  }
})

test('demo controls mutate real simulation state and respect pause/cancel', () => {
  let farm = createDemo()
  farm = reduceFarm(farm, { type: 'add', name: 'Willow', role: 'Coding' })
  assert.equal(farm.agents.length, 6)
  assert.equal(reduceFarm(farm, { type: 'add', name: ' ', role: 'Data' }), farm)
  farm = reduceFarm(farm, { type: 'assign', agentId: 'a5', title: 'Build settings' })
  assert.equal(currentTask(farm, 'a5')?.status, 'walking')
  for (let i = 0; i < 7; i++) farm = reduceFarm(farm, { type: 'tick', now: farm.now + 1000 })
  assert.equal(currentTask(farm, 'a5')?.status, 'running')
  farm = reduceFarm(farm, { type: 'pause', agentId: 'a5' })
  const progress = currentTask(farm, 'a5')?.progress
  farm = reduceFarm(farm, { type: 'tick', now: farm.now + 1000 })
  assert.equal(currentTask(farm, 'a5')?.progress, progress)
  farm = reduceFarm(farm, { type: 'resume', agentId: 'a5' })
  assert.equal(currentTask(farm, 'a5')?.status, 'walking')
  farm = reduceFarm(farm, { type: 'cancel', agentId: 'a5' })
  assert.equal(currentTask(farm, 'a5')?.status, 'cancelled')
  farm = reduceFarm(farm, { type: 'retry', agentId: 'a4' })
  assert.equal(currentTask(farm, 'a4')?.status, 'walking')
})

test('completion releases dependencies; failed dependency becomes actionable error', () => {
  let farm = createDemo()
  farm.tasks = farm.tasks.map(t => t.id === 't2' ? { ...t, progress: 99.9, duration: 1 } : t)
  farm = reduceFarm(farm, { type: 'tick', now: farm.now + 1000 })
  assert.equal(currentTask(farm, 'a2')?.status, 'completed')
  farm = reduceFarm(farm, { type: 'tick', now: farm.now + 1000 })
  assert.equal(currentTask(farm, 'a3')?.status, 'walking')
  let failed = createDemo()
  failed = reduceFarm(failed, { type: 'cancel', agentId: 'a2' })
  failed = reduceFarm(failed, { type: 'tick', now: failed.now + 1000 })
  assert.equal(currentTask(failed, 'a3')?.status, 'error')
})

test('backend boundary rejects corrupt data and never fabricates progress', () => {
  const farm = createDemo()
  const missing = { ...farm, tasks: farm.tasks.map(t => ({ ...t, progress: undefined })) }
  assert.equal(parseSnapshot(missing).tasks[0].progress, null)
  assert.throws(() => parseSnapshot({ ...farm, agents: [{ ...farm.agents[0], color: 'javascript:bad' }] }))
  assert.throws(() => parseSnapshot({ ...farm, tasks: [{ ...farm.tasks[0], progress: 101 }] }))
  assert.throws(() => parseSnapshot({ ...farm, agents: [farm.agents[0], farm.agents[0]] }))
  assert.equal(parseSnapshot({ agents: [], tasks: [], activities: [] }).agents.length, 0)
})
