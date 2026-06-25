import { create } from 'zustand'
import { loadTasksFromDrive, saveTasksToDrive } from '../lib/googleDrive'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PendingTask {
  id: string
  title: string
  backgroundColor?: string
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
  /** Manual bi-directional sync: merge local+Drive and persist merged result to both. */
  syncWithDrive: (token: string) => Promise<void>
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const TASKS_KEY = 'ismailnow_tasks_v1'
const TASK_COLORS = ['#E7F5FF', '#FFF4E6', '#FFF0F6', '#EBFBEE', '#F8F0FC', '#FFF9DB']

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

function pickTaskColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return TASK_COLORS[hash % TASK_COLORS.length]
}

function normalizeTask(task: PendingTask): PendingTask {
  return {
    ...task,
    backgroundColor: task.backgroundColor ?? pickTaskColor(task.id),
  }
}

function mergeTaskPair(base: PendingTask, incoming: PendingTask): PendingTask {
  // Prefer local unsynced changes over remote snapshot when both share the same id.
  if (incoming.synced === false && base.synced !== false) {
    return normalizeTask({ ...base, ...incoming })
  }
  if (base.synced === false && incoming.synced !== false) {
    return normalizeTask({ ...incoming, ...base })
  }
  // If both are unsynced or both synced, preserve completion when either side has it.
  const completedDate =
    base.completedDate && incoming.completedDate
      ? (base.completedDate > incoming.completedDate ? base.completedDate : incoming.completedDate)
      : (base.completedDate ?? incoming.completedDate)
  return normalizeTask({
    ...base,
    ...incoming,
    completedDate,
    synced: base.synced && incoming.synced,
  })
}

function mergeTasks(localTasks: PendingTask[], driveTasks: PendingTask[]): PendingTask[] {
  const byId = new Map<string, PendingTask>()

  for (const task of driveTasks) {
    byId.set(task.id, normalizeTask({ ...task, synced: true }))
  }

  for (const task of localTasks) {
    const localTask = normalizeTask(task)
    const existing = byId.get(localTask.id)
    if (!existing) {
      byId.set(localTask.id, localTask)
      continue
    }
    byId.set(localTask.id, mergeTaskPair(existing, localTask))
  }

  return Array.from(byId.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/**
 * Determines whether a task should be visible on a given date:
 *   created on or before the date  AND  not yet completed (or completed on/after the date)
 */
export function taskVisibleOnDate(task: PendingTask, date: string): boolean {
  return (
    task.startDate <= date &&
    (!task.completedDate || task.completedDate >= date)
  )
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTasksStore = create<TasksStore>((set) => ({
  tasks: [],
  loading: false,
  error: null,

  load: () => {
    set({ tasks: loadFromStorage().map(normalizeTask) })
  },

  fetchForDate: async (_date, token) => {
    set({ loading: true, error: null })
    try {
      if (token) {
        const driveTasks = await loadTasksFromDrive(token)
        const localTasks = loadFromStorage()
        const merged = mergeTasks(localTasks, driveTasks)

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
      backgroundColor: pickTaskColor(id),
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
    try {
      const driveTasks = await loadTasksFromDrive(token)
      const localTasks = loadFromStorage().map(normalizeTask)
      const merged = mergeTasks(localTasks, driveTasks).map((task) => ({ ...task, synced: true }))
      await saveTasksToDrive(token, merged)
      saveToStorage(merged)
      set({ tasks: merged })
    } catch (err) {
      console.error('flushToDrive failed:', err)
    }
  },

  syncWithDrive: async (token) => {
    set({ loading: true, error: null })
    try {
      const driveTasks = await loadTasksFromDrive(token)
      const localTasks = loadFromStorage()
      const merged = mergeTasks(localTasks, driveTasks).map((task) => ({ ...task, synced: true }))
      await saveTasksToDrive(token, merged)
      saveToStorage(merged)
      set({ tasks: merged, loading: false })
    } catch (err) {
      console.error('syncWithDrive failed:', err)
      set({ loading: false, error: 'Cloud sync failed' })
      throw err
    }
  },
}))
