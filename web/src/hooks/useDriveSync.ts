import { useEffect, useRef } from 'react'
import { useHabitsStore } from '../store/habits'
import { useTasksStore } from '../store/tasks'
import { useAuth } from '../contexts/AuthContext'
import { useOnlineStatus } from './useOnlineStatus'

/** How often (in milliseconds) the full task list is pushed to Drive. */
const FLUSH_INTERVAL_MS = 60 * 60 * 1000 // 1 hour
const MUTATION_SYNC_DELAY_MS = 1500

/**
 * useDriveSync
 *
 * Sets up three complementary flush triggers:
 *   1. Periodic interval (every FLUSH_INTERVAL_MS).
 *   2. `visibilitychange` to 'visible' — retries pending work after the user
 *      returns without attempting OAuth from a background tab.
 *   3. `online` event — flushes immediately when network connectivity returns
 *      after being offline.
 *
 * All three require a cached, unexpired token and never initiate authorization.
 */
export function useDriveSync(): void {
  const flushToDrive = useTasksStore((state) => state.flushToDrive)
  const hasPendingTaskChanges = useTasksStore((state) => state.hasPendingChanges)
  const hasPendingHabitChanges = useHabitsStore((state) => state.hasPendingChanges)
  const tasks = useTasksStore((state) => state.tasks)
  const habits = useHabitsStore((state) => state.habits)
  const habitEntries = useHabitsStore((state) => state.entries)
  const { canSync, getAccessToken, hasUsableAccessToken, reauthRequired } = useAuth()
  const isOnline = useOnlineStatus()
  const previousRecordsRef = useRef({ tasks, habits, habitEntries })

  // Upload local mutations promptly without ever initiating OAuth in the background.
  useEffect(() => {
    const previous = previousRecordsRef.current
    previousRecordsRef.current = { tasks, habits, habitEntries }
    if (previous.tasks === tasks && previous.habits === habits && previous.habitEntries === habitEntries) return
    if (!hasPendingTaskChanges() && !hasPendingHabitChanges()) return

    const timeoutId = window.setTimeout(() => {
      if (
        canSync &&
        !reauthRequired &&
        navigator.onLine &&
        document.visibilityState === 'visible' &&
        hasUsableAccessToken() &&
        (hasPendingTaskChanges() || hasPendingHabitChanges())
      ) {
        flushToDrive(getAccessToken).catch(console.error)
      }
    }, MUTATION_SYNC_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [canSync, flushToDrive, getAccessToken, habitEntries, habits, hasPendingHabitChanges, hasPendingTaskChanges, hasUsableAccessToken, reauthRequired, tasks])

  // ── Periodic flush + event listeners ────────────────────────────────────────
  useEffect(() => {
    const flush = (pendingOnly = false) => {
      const hasPendingChanges = hasPendingTaskChanges() || hasPendingHabitChanges()
      if (
        canSync &&
        !reauthRequired &&
        navigator.onLine &&
        document.visibilityState === 'visible' &&
        hasUsableAccessToken() &&
        (!pendingOnly || hasPendingChanges)
      ) {
        flushToDrive(getAccessToken).catch(console.error)
      }
    }

    const intervalId = setInterval(flush, FLUSH_INTERVAL_MS)

    // Retry pending work after returning to the app; hidden tabs must never open OAuth.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') flush(true)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [canSync, flushToDrive, getAccessToken, hasPendingHabitChanges, hasPendingTaskChanges, hasUsableAccessToken, reauthRequired])

  // ── Flush immediately when network comes back online ─────────────────────────
  useEffect(() => {
    if (
      isOnline &&
      canSync &&
      !reauthRequired &&
      document.visibilityState === 'visible' &&
      hasUsableAccessToken()
    ) {
      flushToDrive(getAccessToken).catch(console.error)
    }
  }, [canSync, getAccessToken, hasUsableAccessToken, isOnline, flushToDrive, reauthRequired])
}
