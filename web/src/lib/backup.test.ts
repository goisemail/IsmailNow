import { describe, expect, it } from 'vitest'
import { buildBackupJson } from './backup'

describe('buildBackupJson', () => {
  it('includes dated habit entries in the downloaded JSON backup', () => {
    const entry = {
      id: 'habit-1:2026-08-05',
      habitId: 'habit-1',
      date: '2026-08-05',
      state: 'completed' as const,
      createdAt: '2026-08-05T10:00:00.000Z',
      updatedAt: '2026-08-05T10:00:00.000Z',
      synced: true,
    }
    const json = buildBackupJson([], [entry], [], new Date('2026-08-06T00:00:00.000Z'))
    const backup = JSON.parse(json)

    expect(backup.habitEntries).toEqual([entry])
    expect(backup.exportDate).toBe('2026-08-06T00:00:00.000Z')
  })
})
