import { describe, expect, it } from 'vitest'
import type { PendingPlan } from '../store/plans'
import { buildEvent, planOccurrenceDates } from './planner'

function makePlan(overrides: Partial<PendingPlan> = {}): PendingPlan {
  return {
    id: 'plan-1',
    title: 'Deep work',
    startDate: '2026-10-16',
    startTime: '09:00',
    endTime: '11:00',
    endDate: null,
    isRepeating: false,
    repeatDays: null,
    linkedTaskId: null,
    linkedHabitId: null,
    createdAt: '2026-10-16T00:00:00.000Z',
    updatedAt: '2026-10-16T00:00:00.000Z',
    synced: true,
    ...overrides,
  }
}

describe('planner event building', () => {
  it('places a one-off plan at its real start and end times', () => {
    expect(planOccurrenceDates(makePlan())).toEqual(['2026-10-16'])

    const [event] = [buildEvent(makePlan(), '2026-10-16')]
    expect(event).toMatchObject({
      id: 'plan-1:2026-10-16',
      title: 'Deep work',
      linkedTask: false,
      linkedHabit: false,
    })
    expect(event.start.getHours()).toBe(9)
    expect(event.start.getMinutes()).toBe(0)
    expect(event.end.getHours()).toBe(11)
  })

  it('repeats a daily plan on every day of the range', () => {
    const plan = makePlan({ isRepeating: true, endDate: '2026-10-19' })

    expect(planOccurrenceDates(plan)).toEqual([
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
    ])
  })

  it('repeats only on the selected weekdays and always keeps the first day', () => {
    const plan = makePlan({
      isRepeating: true,
      endDate: '2026-10-29',
      repeatDays: [6, 0],
    })

    expect(planOccurrenceDates(plan)).toEqual([
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
      '2026-10-24',
      '2026-10-25',
    ])
  })

  it('marks link state on events for task and habit links', () => {
    const taskEvent = buildEvent(makePlan({ linkedTaskId: 'task-1' }), '2026-10-16')
    const habitEvent = buildEvent(makePlan({ linkedHabitId: 'habit-1' }), '2026-10-16')

    expect(taskEvent.linkedTask).toBe(true)
    expect(habitEvent.linkedHabit).toBe(true)
  })
})
