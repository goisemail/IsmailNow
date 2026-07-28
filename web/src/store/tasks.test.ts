import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accountStorageKey } from '../lib/accountStorage'

const drive = vi.hoisted(() => ({
  loads: vi.fn(),
  saves: vi.fn(),
}))

vi.mock('../lib/googleDrive', () => {
  class DriveConflictError extends Error {}
  class DriveDataError extends Error {}
  return {
    DriveConflictError,
    DriveDataError,
    loadTasksFromDrive: drive.loads,
    saveTasksToDrive: drive.saves,
  }
})

import { mergeTasks, useTasksStore, type PendingTask } from './tasks'

describe('task synchronization coordinator', () => {
  beforeEach(() => {
    localStorage.clear()
    drive.loads.mockReset()
    drive.saves.mockReset().mockResolvedValue({ id: 'file', version: '2' })
    useTasksStore.getState().clearMemory()
    useTasksStore.getState().load('google:user-1')
  })

  it('serializes overlapping requests and preserves an edit made in flight', async () => {
    let releaseFirst: ((value: unknown) => void) | undefined
    const firstLoad = new Promise((resolve) => {
      releaseFirst = resolve
    })
    drive.loads
      .mockReturnValueOnce(firstLoad)
      .mockResolvedValue({ tasks: [], file: { id: 'file', version: '2' } })

    await useTasksStore.getState().addTask('First', '2026-07-28')
    const firstSync = useTasksStore.getState().flushToDrive(async () => 'token')
    const overlappingSync = useTasksStore.getState().flushToDrive(async () => 'token')

    expect(drive.loads).toHaveBeenCalledTimes(1)
    await useTasksStore.getState().addTask('Added during sync', '2026-07-28')
    releaseFirst?.({ tasks: [], file: { id: 'file', version: '1' } })

    await Promise.all([firstSync, overlappingSync])

    expect(drive.loads).toHaveBeenCalledTimes(2)
    expect(useTasksStore.getState().tasks.map((task) => task.title)).toEqual([
      'First',
      'Added during sync',
    ])
    expect(useTasksStore.getState().tasks.every((task) => task.synced)).toBe(true)
  })

  it('keeps account data in storage when memory is cleared', async () => {
    await useTasksStore.getState().addTask('Retained', '2026-07-28')
    useTasksStore.getState().clearMemory()

    expect(useTasksStore.getState().tasks).toEqual([])
    expect(JSON.parse(localStorage.getItem(accountStorageKey('google:user-1', 'tasks')) ?? '[]'))
      .toHaveLength(1)
  })

  it('allows a newer task version to clear an optional field', () => {
    const completed: PendingTask = {
      id: 'task',
      title: 'Task',
      startDate: '2026-07-28',
      createdAt: '2026-07-28T00:00:00.000Z',
      updatedAt: '2026-07-28T01:00:00.000Z',
      completedDate: '2026-07-28',
      synced: true,
    }
    const uncompleted: PendingTask = {
      ...completed,
      completedDate: undefined,
      updatedAt: '2026-07-28T02:00:00.000Z',
      synced: false,
    }

    expect(mergeTasks([uncompleted], [completed])[0].completedDate).toBeUndefined()
  })
})
