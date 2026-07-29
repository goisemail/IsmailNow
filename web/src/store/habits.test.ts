import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHabitsStore } from './habits'

describe('habit persistence', () => {
  beforeEach(async () => {
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
})
