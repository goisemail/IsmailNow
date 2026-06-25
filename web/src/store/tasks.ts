import { create } from 'zustand'
import { loadTasksFromDrive, saveTasksToDrive } from '../lib/googleDrive'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PendingTask {
  id: string
  title: string
  startDate: string
  createdAt: string
  completedDate?: string
  /**
   * true  = this task has been flushed to the user's Drive file.
   * false = only in localStorage; will be included in the next Drive flush.
   */
  synced: boolean
}

interface TasksStore {
  tasks: PendingTask[]
  loading: boolean
  error: string | null
  /** Load tasks from localStorage into memory (called on app start). */
  load: () => void
  /**
   * Load tasks from Drive and merge with any local un-synced tasks.
   * Falls back to local-only when offline or unauthenticated.
   */
  fetchForDate: (date: string, token: string | null) => Promise<void>
  /** Add a task — writes to localStorage immediately; Drive flush is periodic. */
  addTask: (title: string, startDate: string, token: string | null) => Promise<void>
  /**
   * Mark a task complete on `date`. The task will no longer appear on future
   * dates after `date`.
   */
  markComplete: (id: string, date: string, token: string | null) => Promise<void>
  /** Undo a completion (toggle off). */
  unmarkComplete: (id: string, token: string | null) => void
  /** Delete a task locally; the next Drive flush will propagate the deletion. */
  deleteTask: (id: string) => void
  /**
   * Upload the full task list to Drive.
   * Called periodically by the useDriveSync hook and on tab hide / sign-out.
   */
  flushToDrive: (token: string) => Promise<void>
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const TASKS_KEY = 'ismailnow_tasks_v1'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadFromStorage(): PendingTask[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY)
    return raw ? (JSON.parse(raw) as PendingTask[]) : []
  } catch {
    return []
  }
}

function saveToStorage(tasks: PendingTask[]): void {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
  } catch {
    // Storage full — ignore
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

/**
 * Determines whether a task should be visible on a given date:
 *   created on or before the date  AND  not yet completed (or completed after the date)
 */
export function taskVisibleOnDate(task: PendingTask, date: string): boolean {
  return (
    task.startDate <= date &&
    (!task.completedDate || task.completedDate > date)
  )
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTasksStore = create<TasksStore>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  load: () => {
    set({ tasks: loadFromStorage() })
  },

  fetchForDate: async (_date, token) => {
    set({ loading: true, error: null })
    try {
      if (token) {
        const driveTasks = await loadTasksFromDrive(token)
        // Mark all Drive tasks as synced
        const fromDrive: PendingTask[] = driveTasks.map((t) => ({ ...t, synced: true }))

        // Preserve any local un-synced tasks not yet in Drive
        const localTasks = loadFromStorage()
        const unsynced = localTasks.filter((t) => !t.synced)

        // Merge: Drive is the source of truth for synced tasks
        const merged = [...fromDrive]
        for (const local of unsynced) {
          if (!merged.find((t) => t.id === local.id)) {
            merged.push(local)
          }
        }

        saveToStorage(merged)
        set({ tasks: merged, loading: false })
      } else {
        // Offline / not authenticated — use local tasks only
        const local = loadFromStorage()
        set({ tasks: local, loading: false })
      }
    } catch (err) {
      console.error('fetchForDate failed:', err)
      // Fall back to local storage so UI is never empty
      const local = loadFromStorage()
      set({ tasks: local, loading: false, error: 'Could not reach Google Drive' })
    }
  },

  addTask: async (title, startDate, _token) => {
    const id = generateId()
    const newTask: PendingTask = {
      id,
      title,
      startDate,
      createdAt: new Date().toISOString(),
      synced: false,
    }

    // Write locally immediately for instant UI; Drive flush is periodic
    set((state) => {
      const updated = [...state.tasks, newTask]
      saveToStorage(updated)
      return { tasks: updated }
    })
  },

  markComplete: async (id, date, _token) => {
    set((state) => {
      const updated = state.tasks.map((t) =>
        t.id === id ? { ...t, completedDate: date, synced: false } : t,
      )
      saveToStorage(updated)
      return { tasks: updated }
    })
  },

  unmarkComplete: (id, _token) => {
    set((state) => {
      const updated = state.tasks.map((t) =>
        t.id === id ? { ...t, completedDate: undefined, synced: false } : t,
      )
      saveToStorage(updated)
      return { tasks: updated }
    })
  },

  deleteTask: (id) => {
    set((state) => {
      const updated = state.tasks.filter((t) => t.id !== id)
      saveToStorage(updated)
      return { tasks: updated }
    })
  },

  flushToDrive: async (token) => {
    const tasks = get().tasks
    try {
      await saveTasksToDrive(token, tasks)
      // Mark all tasks as synced after a successful flush
      set((state) => {
        const updated = state.tasks.map((t) => ({ ...t, synced: true }))
        saveToStorage(updated)
        return { tasks: updated }
      })
    } catch (err) {
      console.error('flushToDrive failed:', err)
    }
  },
}))
