import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getHabitStats, habitIsDueOnDate, useHabitsStore, type Habit, type HabitEntry } from './habits'

describe('habit persistence', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    localStorage.clear()
    useHabitsStore.getState().clearMemory()
    await useHabitsStore.getState().load('guest:local')
  })

  it('keeps a volatile habit visible when persistence fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })

    useHabitsStore.getState().addHabit({ name: 'Read', color: '#fff' })

    expect(useHabitsStore.getState().habits).toHaveLength(1)
    expect(useHabitsStore.getState().hasVolatileChanges()).toBe(true)
  })

  it('keeps deletion tombstones for synchronization', () => {
    useHabitsStore.getState().addHabit({ name: 'Read', color: '#fff' })
    const id = useHabitsStore.getState().habits[0].id
    useHabitsStore.getState().deleteHabit(id)

    expect(useHabitsStore.getState().habits[0]).toMatchObject({
      id,
      isDeleted: true,
      synced: false,
    })
    expect(useHabitsStore.getState().habits[0].deletedAt).toBeTruthy()
  })

  it('records binary completion against a specific date', () => {
    useHabitsStore.getState().addHabit({ name: 'Read', color: '#fff', startDate: '2026-07-01' })
    const id = useHabitsStore.getState().habits[0].id

    useHabitsStore.getState().logCompletion(id, '2026-07-28')
    expect(useHabitsStore.getState().entries[0]).toMatchObject({ habitId: id, date: '2026-07-28', state: 'completed' })

    useHabitsStore.getState().logCompletion(id, '2026-07-28')
    expect(useHabitsStore.getState().entries[0].state).toBe('failed')
  })

  it('completes a counter habit when its target is reached', () => {
    useHabitsStore.getState().addHabit({
      name: 'Water',
      color: '#fff',
      startDate: '2026-07-01',
      evaluation: { type: 'counter', criterion: 'atLeast', target: 3, unit: 'glasses' },
    })
    const id = useHabitsStore.getState().habits[0].id

    useHabitsStore.getState().logCompletion(id, '2026-07-28')
    expect(useHabitsStore.getState().entries[0]).toMatchObject({ value: 1, state: 'inProgress' })
    useHabitsStore.getState().logCompletion(id, '2026-07-28')
    useHabitsStore.getState().logCompletion(id, '2026-07-28')
    expect(useHabitsStore.getState().entries[0]).toMatchObject({ value: 3, state: 'completed' })
  })

  it('fails an at-most habit when its limit is exceeded', () => {
    useHabitsStore.getState().addHabit({
      name: 'Coffee',
      color: '#fff',
      startDate: '2026-07-01',
      evaluation: { type: 'counter', criterion: 'atMost', target: 2, unit: 'cups' },
    })
    const id = useHabitsStore.getState().habits[0].id

    useHabitsStore.getState().logCompletion(id, '2026-07-28')
    useHabitsStore.getState().logCompletion(id, '2026-07-28')
    useHabitsStore.getState().logCompletion(id, '2026-07-28')

    expect(useHabitsStore.getState().entries[0]).toMatchObject({ value: 3, state: 'failed' })
  })
})

describe('habit schedules and statistics', () => {
  const habit: Habit = {
    id: 'habit-1',
    name: 'Exercise',
    color: '#fff',
    category: 'Sports',
    priority: 0,
    evaluation: { type: 'binary' },
    schedule: { type: 'weekdays', weekdays: [1, 3, 5] },
    startDate: '2026-07-20',
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
    synced: true,
  }

  const completed = (date: string): HabitEntry => ({
    id: `${habit.id}:${date}`,
    habitId: habit.id,
    date,
    state: 'completed',
    createdAt: `${date}T12:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
    synced: true,
  })

  it('is due only on selected weekdays within its date range', () => {
    expect(habitIsDueOnDate(habit, '2026-07-20')).toBe(true)
    expect(habitIsDueOnDate(habit, '2026-07-21')).toBe(false)
    expect(habitIsDueOnDate({ ...habit, endDate: '2026-07-22' }, '2026-07-24')).toBe(false)
  })

  it('derives missed days, completion rate, and streaks from the schedule', () => {
    const stats = getHabitStats(habit, [
      completed('2026-07-20'),
      completed('2026-07-22'),
      completed('2026-07-27'),
      completed('2026-07-29'),
    ], '2026-07-29')

    expect(stats).toMatchObject({ completed: 4, failed: 1, successRate: 80, currentStreak: 2, bestStreak: 2 })
  })

  it('keeps an active streak while the current scheduled day is pending', () => {
    expect(getHabitStats(habit, [completed('2026-07-27')], '2026-07-29').currentStreak).toBe(1)
  })
})
