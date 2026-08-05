import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  flush: vi.fn(async () => undefined),
  auth: {
    canSync: true,
    reauthRequired: false,
    getAccessToken: vi.fn(async () => 'token'),
  },
  online: true,
}))

vi.mock('../store/tasks', () => ({
  useTasksStore: (selector: (state: { flushToDrive: typeof mocks.flush }) => unknown) =>
    selector({ flushToDrive: mocks.flush }),
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
    mocks.online = true
  })

  afterEach(() => vi.useRealTimers())

  it('flushes on the hourly interval and hidden visibility event', () => {
    const { unmount } = renderHook(() => useDriveSync())
    mocks.flush.mockClear()

    act(() => vi.advanceTimersByTime(60 * 60 * 1000))
    expect(mocks.flush).toHaveBeenCalledTimes(1)

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
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
})
