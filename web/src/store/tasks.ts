import { create } from 'zustand'
import { accountStorageKey } from '../lib/accountStorage'
import {
  DriveConflictError,
  DriveDataError,
  loadTasksFromDrive,
  restoreDriveBackup,
  saveTasksToDrive,
  type TokenProvider,
} from '../lib/googleDrive'
import { mergeHabitEntries, mergeHabits, useHabitsStore } from './habits'

export interface PendingTask {
  id: string
  title: string
  backgroundColor?: string
  startDate: string
  createdAt: string
  updatedAt: string
  completedDate?: string
  isDeleted?: boolean
  deletedAt?: string
  synced: boolean
}

interface TasksStore {
  ownerId: string | null
  tasks: PendingTask[]
  loading: boolean
  error: string | null
  volatile: boolean
  load: (ownerId: string) => void
  clearMemory: () => void
  hasPendingChanges: () => boolean
  hasVolatileChanges: () => boolean
  retryPersistence: () => boolean
  fetchForDate: (date: string, getToken: TokenProvider | null) => Promise<void>
  addTask: (title: string, startDate: string) => Promise<void>
  updateTaskTitle: (id: string, title: string) => void
  markComplete: (id: string, date: string) => Promise<void>
  unmarkComplete: (id: string) => void
  deleteTask: (id: string, getToken?: TokenProvider | null) => Promise<void>
  flushToDrive: (getToken: TokenProvider) => Promise<void>
  syncWithDrive: (getToken: TokenProvider) => Promise<void>
  restoreBackup: (getToken: TokenProvider, backupId: string) => Promise<void>
}

const TASK_COLORS = ['#E7F5FF', '#FFF4E6', '#FFF0F6', '#EBFBEE', '#F8F0FC', '#FFF9DB']
const MAX_CONFLICT_RETRIES = 3

function loadFromStorage(ownerId: string): PendingTask[] {
  const raw = localStorage.getItem(accountStorageKey(ownerId, 'tasks'))
  return raw ? (JSON.parse(raw) as PendingTask[]) : []
}

function saveToStorage(ownerId: string, tasks: PendingTask[]): void {
  localStorage.setItem(accountStorageKey(ownerId, 'tasks'), JSON.stringify(tasks))
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function pickTaskColor(id: string): string {
  let hash = 0
  for (let offset = 0; offset < id.length; offset += 1) {
    hash = (hash * 31 + id.charCodeAt(offset)) >>> 0
  }
  return TASK_COLORS[hash % TASK_COLORS.length]
}

function normalizeTask(task: PendingTask): PendingTask {
  return {
    ...task,
    backgroundColor: task.backgroundColor ?? pickTaskColor(task.id),
    updatedAt: task.updatedAt || task.createdAt || new Date().toISOString(),
    synced: task.synced !== false,
  }
}

function mergeTaskPair(base: PendingTask, incoming: PendingTask): PendingTask {
  const winner = base.updatedAt >= incoming.updatedAt ? base : incoming
  return normalizeTask({
    ...winner,
    synced: base.synced && incoming.synced,
  })
}

export function mergeTasks(localTasks: PendingTask[], driveTasks: PendingTask[]): PendingTask[] {
  const byId = new Map<string, PendingTask>()

  for (const task of driveTasks) byId.set(task.id, normalizeTask({ ...task, synced: true }))
  for (const task of localTasks) {
    const localTask = normalizeTask(task)
    const existing = byId.get(localTask.id)
    byId.set(localTask.id, existing ? mergeTaskPair(existing, localTask) : localTask)
  }

  return Array.from(byId.values()).sort((left, right) => left.createdAt.localeCompare(right.createdAt))
}

export function taskVisibleOnDate(task: PendingTask, date: string): boolean {
  return (
    !task.isDeleted &&
    task.startDate <= date &&
    (!task.completedDate || task.completedDate >= date)
  )
}

export const useTasksStore = create<TasksStore>((set, get) => {
  interface SyncRun {
    generation: number
    followUpRequested: boolean
    promise: Promise<void>
  }

  let syncGeneration = 0
  let activeRun: SyncRun | null = null

  const persist = (ownerId: string, tasks: PendingTask[]): boolean => {
    try {
      saveToStorage(ownerId, tasks)
      return true
    } catch {
      return false
    }
  }

  const syncOnce = async (getToken: TokenProvider, generation: number): Promise<boolean> => {
    const ownerId = get().ownerId
    if (!ownerId || generation !== syncGeneration) return false

    for (let attempt = 0; attempt < MAX_CONFLICT_RETRIES; attempt += 1) {
      const localSnapshot = get().tasks.map(normalizeTask)
      const localHabits = useHabitsStore.getState().habits
      const localHabitEntries = useHabitsStore.getState().entries
      const remote = await loadTasksFromDrive(getToken)
      const merged = mergeTasks(localSnapshot, remote.tasks).map((task) => ({ ...task, synced: true }))
      const mergedHabits = mergeHabits(localHabits, remote.habits ?? []).map((habit) => ({
        ...habit,
        synced: true,
      }))
      const mergedHabitEntries = mergeHabitEntries(localHabitEntries, remote.habitEntries ?? []).map((entry) => ({
        ...entry,
        synced: true,
      }))

      try {
        await saveTasksToDrive(
          getToken,
          merged,
          remote.file,
          mergedHabits,
          mergedHabitEntries,
          remote.duplicateFileIds ?? [],
          remote.contentFingerprint,
          true,
          remote.requiresCanonicalMigration ?? false,
        )
      } catch (error) {
        if (error instanceof DriveConflictError && attempt + 1 < MAX_CONFLICT_RETRIES) {
          await new Promise((resolve) => {
            const delay = 50 * 2 ** attempt + Math.floor(Math.random() * 25)
            setTimeout(resolve, delay)
          })
          continue
        }
        throw error
      }

      if (get().ownerId !== ownerId || generation !== syncGeneration) return false

      const latest = get().tasks.map(normalizeTask)
      const latestHabits = useHabitsStore.getState().habits
      const latestHabitEntries = useHabitsStore.getState().entries
      const uploadedById = new Map(merged.map((task) => [task.id, task]))
      const latestById = new Map(latest.map((task) => [task.id, task]))
      const reconciled = mergeTasks(latest, merged).map((task) => {
        const uploaded = uploadedById.get(task.id)
        const current = latestById.get(task.id)
        const changedDuringSync = Boolean(current && (!uploaded || current.updatedAt !== uploaded.updatedAt))
        return { ...task, synced: !changedDuringSync }
      })
      const persisted = persist(ownerId, reconciled)
      set({
        tasks: reconciled,
        volatile: !persisted,
        error: persisted ? null : 'Changes could not be saved in this browser.',
      })

      const uploadedHabits = new Map(mergedHabits.map((habit) => [habit.id, habit]))
      const latestHabitsById = new Map(latestHabits.map((habit) => [habit.id, habit]))
      const reconciledHabits = mergeHabits(latestHabits, mergedHabits).map((habit) => {
        const uploaded = uploadedHabits.get(habit.id)
        const current = latestHabitsById.get(habit.id)
        const changedDuringSync = Boolean(current && (!uploaded || current.updatedAt !== uploaded.updatedAt))
        return { ...habit, synced: !changedDuringSync }
      })
      const uploadedEntries = new Map(mergedHabitEntries.map((entry) => [entry.id, entry]))
      const latestEntriesById = new Map(latestHabitEntries.map((entry) => [entry.id, entry]))
      const reconciledEntries = mergeHabitEntries(latestHabitEntries, mergedHabitEntries).map((entry) => {
        const uploaded = uploadedEntries.get(entry.id)
        const current = latestEntriesById.get(entry.id)
        return { ...entry, synced: !current || Boolean(uploaded && current.updatedAt === uploaded.updatedAt) }
      })
      useHabitsStore.getState().applySyncResult(reconciledHabits, reconciledEntries)

      return reconciled.some((task) => !task.synced) ||
        reconciledHabits.some((habit) => !habit.synced) ||
        reconciledEntries.some((entry) => !entry.synced)
    }
    return false
  }

  const requestSync = (getToken: TokenProvider): Promise<void> => {
    if (activeRun?.generation === syncGeneration) {
      activeRun.followUpRequested = true
      return activeRun.promise
    }

    const run: SyncRun = {
      generation: syncGeneration,
      followUpRequested: true,
      promise: Promise.resolve(),
    }
    const drain = async () => {
      try {
        do {
          run.followUpRequested = false
          if (await syncOnce(getToken, run.generation)) run.followUpRequested = true
        } while (run.followUpRequested && run.generation === syncGeneration)
      } finally {
        if (activeRun === run) activeRun = null
      }
    }
    const lockName = `ismailnow-sync:${get().ownerId ?? 'none'}`
    run.promise = navigator.locks
      ? navigator.locks.request(lockName, drain).then(() => undefined)
      : drain()
    activeRun = run
    return run.promise
  }

  const updateLocal = (transform: (tasks: PendingTask[]) => PendingTask[]): void => {
    set((state) => {
      if (!state.ownerId) return state
      const tasks = transform(state.tasks)
      const persisted = persist(state.ownerId, tasks)
      return {
        tasks,
        volatile: !persisted,
        error: persisted ? null : 'Changes could not be saved in this browser.',
      }
    })
  }

  return {
    ownerId: null,
    tasks: [],
    loading: false,
    error: null,
    volatile: false,

    load: (ownerId) => {
      syncGeneration += 1
      activeRun = null
      try {
        set({
          ownerId,
          tasks: loadFromStorage(ownerId).map(normalizeTask),
          loading: false,
          error: null,
          volatile: false,
        })
      } catch {
        set({
          ownerId,
          tasks: [],
          loading: false,
          volatile: false,
          error: 'Saved tasks could not be loaded.',
        })
      }
    },

    clearMemory: () => {
      syncGeneration += 1
      activeRun = null
      set({ ownerId: null, tasks: [], loading: false, error: null, volatile: false })
    },

    hasPendingChanges: () => get().tasks.some((task) => !task.synced),

    hasVolatileChanges: () => get().volatile,

    retryPersistence: () => {
      const state = get()
      if (!state.ownerId) return true
      const persisted = persist(state.ownerId, state.tasks)
      set({
        volatile: !persisted,
        error: persisted ? null : 'Changes could not be saved in this browser.',
      })
      return persisted
    },

    fetchForDate: async (_date, getToken) => {
      if (!getToken) return
      set({ loading: true, error: null })
      try {
        await requestSync(getToken)
        set({ loading: false })
      } catch (error) {
        const message = error instanceof DriveDataError
          ? 'Cloud sync is blocked because the Drive file is damaged.'
          : 'Could not reach Google Drive.'
        set({ loading: false, error: message })
      }
    },

    addTask: async (title, startDate) => {
      const id = generateId()
      const now = new Date().toISOString()
      const task: PendingTask = {
        id,
        title,
        backgroundColor: pickTaskColor(id),
        startDate,
        createdAt: now,
        updatedAt: now,
        synced: false,
      }
      updateLocal((tasks) => [...tasks, task])
    },

    updateTaskTitle: (id, title) => {
      const cleanTitle = title.trim()
      if (!cleanTitle) return
      updateLocal((tasks) => tasks.map((task) =>
        task.id === id
          ? { ...task, title: cleanTitle, updatedAt: new Date().toISOString(), synced: false }
          : task,
      ))
    },

    markComplete: async (id, date) => {
      updateLocal((tasks) => tasks.map((task) =>
        task.id === id
          ? { ...task, completedDate: date, updatedAt: new Date().toISOString(), synced: false }
          : task,
      ))
    },

    unmarkComplete: (id) => {
      updateLocal((tasks) => tasks.map((task) =>
        task.id === id
          ? { ...task, completedDate: undefined, updatedAt: new Date().toISOString(), synced: false }
          : task,
      ))
    },

    deleteTask: async (id, getToken) => {
      const now = new Date().toISOString()
      updateLocal((tasks) => tasks.map((task) =>
        task.id === id
          ? { ...task, isDeleted: true, deletedAt: now, updatedAt: now, synced: false }
          : task,
      ))
      if (getToken && navigator.onLine) {
        try {
          await requestSync(getToken)
        } catch (error) {
          set({
            error: error instanceof DriveDataError
              ? 'Cloud sync is blocked because the Drive file is damaged.'
              : 'The deletion is saved locally and will retry syncing later.',
          })
        }
      }
    },

    flushToDrive: async (getToken) => {
      try {
        await requestSync(getToken)
      } catch (error) {
        set({
          error: error instanceof DriveDataError
            ? 'Cloud sync is blocked because the Drive file is damaged.'
            : 'Cloud sync failed.',
        })
        throw error
      }
    },

    syncWithDrive: async (getToken) => {
      set({ loading: true, error: null })
      try {
        await requestSync(getToken)
        set({ loading: false })
      } catch (error) {
        set({
          loading: false,
          error: error instanceof DriveDataError
            ? 'Cloud sync is blocked because the Drive file is damaged.'
            : 'Cloud sync failed.',
        })
        throw error
      }
    },

    restoreBackup: async (getToken, backupId) => {
      set({ loading: true, error: null })
      try {
        const restored = await restoreDriveBackup(getToken, backupId)
        const tasks = restored.tasks.map((task) => ({ ...task, synced: true }))
        const habits = restored.habits.map((habit) => ({ ...habit, synced: true }))
        const entries = restored.habitEntries.map((entry) => ({ ...entry, synced: true }))
        const ownerId = get().ownerId
        if (!ownerId) throw new Error('No active account.')
        const persisted = persist(ownerId, tasks)
        set({
          tasks,
          loading: false,
          volatile: !persisted,
          error: persisted ? null : 'Restored tasks could not be saved in this browser.',
        })
        useHabitsStore.getState().applySyncResult(habits, entries)
      } catch (error) {
        set({ loading: false, error: 'Backup restore failed.' })
        throw error
      }
    },
  }
})
