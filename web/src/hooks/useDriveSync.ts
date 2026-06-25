import { useEffect, useRef } from 'react'
import { useTasksStore } from '../store/tasks'
import { useAuth } from '../contexts/AuthContext'
import { useOnlineStatus } from './useOnlineStatus'

/** How often (in milliseconds) the full task list is pushed to Drive. */
const FLUSH_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

/**
 * useDriveSync
 *
 * Sets up three complementary flush triggers:
 *   1. Periodic interval (every FLUSH_INTERVAL_MS).
 *   2. `visibilitychange` to 'hidden' — fires when the user switches tabs or
 *      minimises the window, giving us a chance to save before the browser
 *      suspends the page.
 *   3. `online` event — flushes immediately when network connectivity returns
 *      after being offline.
 *
 * All three are no-ops when the user is not signed in or the device is offline.
 */
export function useDriveSync(): void {
  const flushToDrive = useTasksStore((state) => state.flushToDrive)
  const { user } = useAuth()
  const isOnline = useOnlineStatus()

  // Keep a stable ref to the current token so event listeners always see the
  // latest value without needing to be re-registered on every token change.
  const tokenRef = useRef<string | null>(null)
  tokenRef.current = user?.accessToken ?? null

  // ── Periodic flush + event listeners ────────────────────────────────────────
  useEffect(() => {
    const flush = () => {
      if (tokenRef.current && navigator.onLine) {
        flushToDrive(tokenRef.current).catch(console.error)
      }
    }

    const intervalId = setInterval(flush, FLUSH_INTERVAL_MS)

    // Flush when the tab is hidden (user switches away / minimises)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [flushToDrive])

  // ── Flush immediately when network comes back online ─────────────────────────
  useEffect(() => {
    if (isOnline && tokenRef.current) {
      flushToDrive(tokenRef.current).catch(console.error)
    }
  }, [isOnline, flushToDrive])
}
