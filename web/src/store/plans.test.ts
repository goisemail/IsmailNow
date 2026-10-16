import { beforeEach, describe, expect, it } from 'vitest'
import { accountStorageKey } from '../lib/accountStorage'
import { mergePlans, usePlansStore, type PendingPlan } from './plans'

function makePlan(overrides: Partial<PendingPlan> = {}): PendingPlan {
  return {
    id: 'plan-1',
    title: 'Deep work',
    startDate: '2026-07-28',
    startTime: '09:00',
    endTime: '11:00',
    endDate: null,
    isRepeating: false,
    linkedTaskId: null,
    linkedHabitId: null,
    createdAt: '2026-07-28T00:00:00.000Z',
    updatedAt: '2026-07-28T00:00:00.000Z',
    synced: false,
    ...overrides,
  }
}

describe('plans store', () => {
  beforeEach(() => {
    localStorage.clear()
    usePlansStore.getState().clearMemory()
    usePlansStore.getState().load('google:user-1')
  })

  it('persists a new plan with the submitted times', () => {
    const id = usePlansStore.getState().addPlan({
      title: 'Reading',
      startDate: '2026-07-28',
      startTime: '21:00',
      endTime: '22:30',
    })

    const plans = usePlansStore.getState().plans
    expect(plans).toHaveLength(1)
    expect(plans[0]).toMatchObject({
      id,
      title: 'Reading',
      startDate: '2026-07-28',
      startTime: '21:00',
      endTime: '22:30',
      isRepeating: false,
      endDate: null,
      synced: false,
    })
    expect(usePlansStore.getState().hasPendingChanges()).toBe(true)
    expect(JSON.parse(localStorage.getItem(accountStorageKey('google:user-1', 'plans')) ?? '[]'))
      .toHaveLength(1)
  })

  it('stores the repeat end date only when repeating', () => {
    usePlansStore.getState().addPlan({
      title: 'Standup',
      startDate: '2026-07-28',
      startTime: '09:30',
      endTime: '09:45',
      isRepeating: true,
      endDate: '2026-08-04',
    })

    expect(usePlansStore.getState().plans[0]).toMatchObject({
      isRepeating: true,
      endDate: '2026-08-04',
    })
  })

  it('stores selected weekday repeats and treats an empty selection as daily', () => {
    usePlansStore.getState().addPlan({
      title: 'Weekend gym',
      startDate: '2026-07-28',
      startTime: '10:00',
      endTime: '11:00',
      isRepeating: true,
      endDate: '2026-08-04',
      repeatDays: [6, 0],
    })
    usePlansStore.getState().addPlan({
      title: 'Daily reset',
      startDate: '2026-07-28',
      startTime: '08:00',
      endTime: '08:15',
      isRepeating: true,
      endDate: '2026-08-04',
      repeatDays: [],
    })

    expect(usePlansStore.getState().plans[0].repeatDays).toEqual([0, 6])
    expect(usePlansStore.getState().plans[1].repeatDays).toBeNull()
  })

  it('links a plan to a task and marks it unsynced', () => {
    const id = usePlansStore.getState().addPlan({
      title: 'Gym',
      startDate: '2026-07-28',
      startTime: '18:00',
      endTime: '19:00',
    })

    usePlansStore.getState().updatePlanLinks(id, { linkedTaskId: 'task-42' })

    expect(usePlansStore.getState().plans[0]).toMatchObject({
      linkedTaskId: 'task-42',
      synced: false,
    })
  })

  it('reloads stored plans for the account', () => {
    usePlansStore.getState().addPlan({
      title: 'Journal',
      startDate: '2026-07-28',
      startTime: '07:00',
      endTime: '07:15',
    })
    usePlansStore.getState().clearMemory()
    expect(usePlansStore.getState().plans).toEqual([])

    usePlansStore.getState().load('google:user-1')

    expect(usePlansStore.getState().plans).toHaveLength(1)
    expect(usePlansStore.getState().plans[0].title).toBe('Journal')
  })

  it('applies a sync result as persisted, synced state', () => {
    usePlansStore.getState().applySyncResult([makePlan({ synced: true })])

    expect(usePlansStore.getState().plans[0].synced).toBe(true)
    expect(usePlansStore.getState().hasPendingChanges()).toBe(false)
  })

  it('keeps the newer version when merging plans', () => {
    const older = makePlan({ title: 'Old', updatedAt: '2026-07-28T00:00:00.000Z' })
    const newer = makePlan({ title: 'New', updatedAt: '2026-07-28T02:00:00.000Z' })

    expect(mergePlans([older], [newer])[0].title).toBe('New')
    expect(mergePlans([newer], [older])[0].title).toBe('New')
    expect(mergePlans([older], [newer])[0].synced).toBe(true)
  })
})
