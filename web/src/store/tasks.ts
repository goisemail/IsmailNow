import { create } from 'zustand'
import { appendTask, markTaskComplete, fetchTasksForDate } from '../lib/googleSheets'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PendingTask {
  id: string
  title: string
  startDate: string
  createdAt: string
  completedDate?: string
  /**
   * true  = this task has been written to the user's Google Sheet.
   * false = offline or failed; sitting in the local sync queue.
   */
  synced: boolean
}

interface SyncOp {
  op: 'add' | 'complete'
  taskId: string
  date?: string           // populated for 'complete' ops
  timestamp: string
}

interface TasksStore {
  tasks: PendingTask[]
  loading: boolean
  error: string | null
  /** Load tasks from localStorage into memory (called on app start). */
  load: () => void
  /**
   * Fetch tasks for a given date from Google Sheets and merge with local
   * un-synced tasks. Falls back to local-only when offline or unauthenticated.
   */
  fetchForDate: (date: string, token: string | null) => Promise<void>
  /** Add a task — writes locally immediately, syncs online if possible. */
  addTask: (title: string, startDate: string, token: string | null) => Promise<void>
  /**
   * Mark a task complete on `date`. The task will no longer appear on future
   * dates after `date`.
   */
  markComplete: (id: string, date: string, token: string | null) => Promise<void>
  /** Undo a completion (toggle off). */
  unmarkComplete: (id: string, token: string | null) => void
  /** Delete a task locally (Google Sheet row stays; cleanup is manual for now). */
  deleteTask: (id: string) => void
  /**
   * Drain the offline sync queue. Call this when the network comes back online.
   */
  syncPending: (token: string) => Promise<void>
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const TASKS_KEY = 'ismailnow_tasks_v1'
const QUEUE_KEY = 'ismailnow_sync_queue_v1'

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

function loadQueue(): SyncOp[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? (JSON.parse(raw) as SyncOp[]) : []
  } catch {
    return []
  }
}

function saveQueue(queue: SyncOp[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // ignore
  }
}

function enqueue(op: SyncOp): void {
  const queue = loadQueue()
  queue.push(op)
  saveQueue(queue)
}

function dequeue(taskId: string, op: SyncOp['op']): void {
  const queue = loadQueue().filter((q) => !(q.taskId === taskId && q.op === op))
  saveQueue(queue)
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

  fetchForDate: async (date, token) => {
    set({ loading: true, error: null })
    try {
      if (token) {
        const sheetTasks = await fetchTasksForDate(token, date)
        // Convert SheetTask → PendingTask and merge with un-synced local tasks
        const fromSheet: PendingTask[] = sheetTasks.map((t) => ({
          id: t.id,
          title: t.title,
          startDate: t.startDate,
          createdAt: t.createdAt,
          completedDate: t.completedDate || undefined,
          synced: true,
        }))

        // Preserve any local un-synced tasks not yet in the sheet
        const localTasks = loadFromStorage()
        const unsynced = localTasks.filter((t) => !t.synced)

        // Merge: sheet is the source of truth for synced tasks
        const merged = [...fromSheet]
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
      set({ tasks: local, loading: false, error: 'Could not reach Google Sheets' })
    }
  },

  addTask: async (title, startDate, token) => {
    const id = generateId()
    const newTask: PendingTask = {
      id,
      title,
      startDate,
      createdAt: new Date().toISOString(),
      synced: false,
    }

    // 1. Write locally immediately for instant UI
    set((state) => {
      const updated = [...state.tasks, newTask]
      saveToStorage(updated)
      return { tasks: updated }
    })

    // 2. Try to sync right now if online
    if (token) {
      try {
        await appendTask(token, {
          id: newTask.id,
          title: newTask.title,
          startDate: newTask.startDate,
          createdAt: newTask.createdAt,
          completedDate: '',
        })
        // Mark synced in local storage
        set((state) => {
          const updated = state.tasks.map((t) =>
            t.id === id ? { ...t, synced: true } : t,
          )
          saveToStorage(updated)
          return { tasks: updated }
        })
      } catch {
        // Network failed — enqueue for later
        enqueue({ op: 'add', taskId: id, timestamp: new Date().toISOString() })
      }
    } else {
      // Offline — enqueue
      enqueue({ op: 'add', taskId: id, timestamp: new Date().toISOString() })
    }
  },

  markComplete: async (id, date, token) => {
    // 1. Update locally
    set((state) => {
      const updated = state.tasks.map((t) =>
        t.id === id ? { ...t, completedDate: date } : t,
      )
      saveToStorage(updated)
      return { tasks: updated }
    })

    // 2. Sync to sheet if possible
    if (token) {
      try {
        await markTaskComplete(token, id, date)
        dequeue(id, 'complete')
      } catch {
        enqueue({ op: 'complete', taskId: id, date, timestamp: new Date().toISOString() })
      }
    } else {
      enqueue({ op: 'complete', taskId: id, date, timestamp: new Date().toISOString() })
    }
  },

  unmarkComplete: (id, _token) => {
    set((state) => {
      const updated = state.tasks.map((t) =>
        t.id === id ? { ...t, completedDate: undefined } : t,
      )
      saveToStorage(updated)
      return { tasks: updated }
    })
    // Note: un-completing is a local-only action in this version.
    // If needed, a full sheet re-scan to clear column E can be added later.
  },

  deleteTask: (id) => {
    set((state) => {
      const updated = state.tasks.filter((t) => t.id !== id)
      saveToStorage(updated)
      return { tasks: updated }
    })
  },

  syncPending: async (token) => {
    const queue = loadQueue()
    if (queue.length === 0) return

    const tasks = get().tasks
    const remaining: SyncOp[] = []

    for (const op of queue) {
      const task = tasks.find((t) => t.id === op.taskId)
      if (!task) continue // task was deleted locally — skip

      try {
        if (op.op === 'add') {
          await appendTask(token, {
            id: task.id,
            title: task.title,
            startDate: task.startDate,
            createdAt: task.createdAt,
            completedDate: task.completedDate ?? '',
          })
          // Mark synced
          set((state) => {
            const updated = state.tasks.map((t) =>
              t.id === task.id ? { ...t, synced: true } : t,
            )
            saveToStorage(updated)
            return { tasks: updated }
          })
        } else if (op.op === 'complete' && op.date) {
          await markTaskComplete(token, task.id, op.date)
        }
      } catch {
        // Keep failed ops in the queue for the next sync attempt
        remaining.push(op)
      }
    }

    saveQueue(remaining)
  },
}))
