import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  flush: vi.fn(async () => undefined),
  auth: {
    canSync: true,
    reauthRequired: false,
    getAccessToken: vi.fn(async () => 'token'),
    hasUsableAccessToken: vi.fn(() => true),
  },
  pendingTasks: true,
  pendingHabits: false,
  tasks: [] as unknown[],
  habits: [] as unknown[],
  entries: [] as unknown[],
  online: true,
}))

vi.mock('../store/tasks', () => ({
  useTasksStore: (selector: (state: {
    flushToDrive: typeof mocks.flush
    hasPendingChanges: () => boolean
    tasks: unknown[]
  }) => unknown) => selector({
    flushToDrive: mocks.flush,
    hasPendingChanges: () => mocks.pendingTasks,
    tasks: mocks.tasks,
  }),
}))
vi.mock('../store/habits', () => ({
  useHabitsStore: (selector: (state: {
    hasPendingChanges: () => boolean
    habits: unknown[]
    entries: unknown[]
  }) => unknown) => selector({
    hasPendingChanges: () => mocks.pendingHabits,
    habits: mocks.habits,
    entries: mocks.entries,
  }),
}))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => mocks.auth }))
vi.mock('./useOnlineStatus', () => ({ useOnlineStatus: () => mocks.online }))

import { useDriveSync } from './useDriveSync'

describe('useDriveSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.flush.mockClear()
    mocks.auth.canSync = true
    mocks.auth.reauthRequired = false
    mocks.auth.hasUsableAccessToken.mockReturnValue(true)
    mocks.pendingTasks = true
    mocks.pendingHabits = false
    mocks.tasks = []
    mocks.habits = []
    mocks.entries = []
    mocks.online = true
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  })

  afterEach(() => vi.useRealTimers())

  it('flushes on the hourly interval and retries pending work when visible again', () => {
    const { unmount } = renderHook(() => useDriveSync())
    mocks.flush.mockClear()

    act(() => vi.advanceTimersByTime(60 * 60 * 1000))
    expect(mocks.flush).toHaveBeenCalledTimes(1)

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(mocks.flush).toHaveBeenCalledTimes(1)

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(mocks.flush).toHaveBeenCalledTimes(2)

    unmount()
    act(() => vi.advanceTimersByTime(60 * 60 * 1000))
    expect(mocks.flush).toHaveBeenCalledTimes(2)
  })

  it('does not flush while reauthorization is required', () => {
    mocks.auth.reauthRequired = true
    renderHook(() => useDriveSync())

    act(() => vi.advanceTimersByTime(60 * 60 * 1000))

    expect(mocks.flush).not.toHaveBeenCalled()
  })

  it('does not flush or request a token after the cached token expires', () => {
    mocks.auth.hasUsableAccessToken.mockReturnValue(false)
    renderHook(() => useDriveSync())

    act(() => vi.advanceTimersByTime(60 * 60 * 1000))

    expect(mocks.flush).not.toHaveBeenCalled()
    expect(mocks.auth.getAccessToken).not.toHaveBeenCalled()
  })

  it('debounces a pending habit-entry mutation and uploads it promptly', () => {
    const { rerender } = renderHook(() => useDriveSync())
    mocks.flush.mockClear()
    mocks.pendingTasks = false
    mocks.pendingHabits = true
    mocks.entries = [{ id: 'habit-1:2026-08-05' }]

    rerender()
    act(() => vi.advanceTimersByTime(1499))
    expect(mocks.flush).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1))
    expect(mocks.flush).toHaveBeenCalledOnce()
  })
})
