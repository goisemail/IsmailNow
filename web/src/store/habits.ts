import { create } from 'zustand'
import { accountStorageKey } from '../lib/accountStorage'

export interface Habit {
  id: string
  name: string
  color: string
  progress: number
  streak: number
  lastCompletedDate?: string
  createdAt: string
  updatedAt: string
  synced: boolean
  isDeleted?: boolean
  deletedAt?: string
}

interface HabitsStore {
  ownerId: string | null
  habits: Habit[]
  error: string | null
  volatile: boolean
  load: (ownerId: string) => Promise<void>
  save: () => Promise<void>
  clearMemory: () => void
  hasVolatileChanges: () => boolean
  retryPersistence: () => boolean
  applySyncResult: (habits: Habit[]) => void
  addHabit: (habit: Omit<Habit, 'id' | 'progress' | 'streak' | 'createdAt' | 'updatedAt' | 'synced'>) => void
  updateHabit: (id: string, patch: Partial<Habit>) => void
  logCompletion: (id: string) => void
  deleteHabit: (id: string) => void
}

function normalizeHabit(habit: Habit): Habit {
  const fallback = habit.updatedAt || habit.createdAt || new Date().toISOString()
  return {
    ...habit,
    createdAt: habit.createdAt || fallback,
    updatedAt: fallback,
    synced: habit.synced !== false,
  }
}

export function mergeHabits(local: Habit[], remote: Habit[]): Habit[] {
  const byId = new Map<string, Habit>()
  for (const habit of remote) byId.set(habit.id, normalizeHabit({ ...habit, synced: true }))
  for (const habit of local) {
    const normalized = normalizeHabit(habit)
    const existing = byId.get(habit.id)
    if (!existing || normalized.updatedAt > existing.updatedAt) byId.set(habit.id, normalized)
    else if (normalized.updatedAt === existing.updatedAt) {
      byId.set(habit.id, { ...existing, synced: existing.synced && normalized.synced })
    }
  }
  return Array.from(byId.values()).sort((left, right) => left.createdAt.localeCompare(right.createdAt))
}

export const useHabitsStore = create<HabitsStore>((set, get) => {
  const persist = (ownerId: string, habits: Habit[]): boolean => {
    try {
      localStorage.setItem(accountStorageKey(ownerId, 'habits'), JSON.stringify(habits))
      return true
    } catch {
      return false
    }
  }

  const updateLocal = (transform: (habits: Habit[]) => Habit[]): void => {
    set((state) => {
      if (!state.ownerId) return state
      const habits = transform(state.habits)
      const persisted = persist(state.ownerId, habits)
      return {
        habits,
        volatile: !persisted,
        error: persisted ? null : 'Habit changes could not be saved in this browser.',
      }
    })
  }

  return {
    ownerId: null,
    habits: [],
    error: null,
    volatile: false,

    load: async (ownerId) => {
      try {
        const stored = localStorage.getItem(accountStorageKey(ownerId, 'habits'))
        set({
          ownerId,
          habits: stored ? (JSON.parse(stored) as Habit[]).map(normalizeHabit) : [],
          error: null,
          volatile: false,
        })
      } catch {
        set({ ownerId, habits: [], error: 'Saved habits could not be loaded.', volatile: false })
      }
    },

    save: async () => {
      const state = get()
      if (!state.ownerId) return
      const persisted = persist(state.ownerId, state.habits)
      set({
        volatile: !persisted,
        error: persisted ? null : 'Habit changes could not be saved in this browser.',
      })
    },

    clearMemory: () => set({ ownerId: null, habits: [], error: null, volatile: false }),

    hasVolatileChanges: () => get().volatile,

    retryPersistence: () => {
      const state = get()
      if (!state.ownerId) return true
      const persisted = persist(state.ownerId, state.habits)
      set({
        volatile: !persisted,
        error: persisted ? null : 'Habit changes could not be saved in this browser.',
      })
      return persisted
    },

    applySyncResult: (habits) => {
      const state = get()
      if (!state.ownerId) return
      const persisted = persist(state.ownerId, habits)
      set({
        habits,
        volatile: !persisted,
        error: persisted ? null : 'Habit changes could not be saved in this browser.',
      })
    },

    addHabit: (habitData) => {
      const now = new Date().toISOString()
      const habit: Habit = {
        id: Math.random().toString(36).slice(2, 11),
        ...habitData,
        progress: 0,
        streak: 0,
        createdAt: now,
        updatedAt: now,
        synced: false,
      }
      updateLocal((habits) => [...habits, habit])
    },

    updateHabit: (id, patch) => {
      updateLocal((habits) => habits.map((habit) =>
        habit.id === id
          ? { ...habit, ...patch, updatedAt: new Date().toISOString(), synced: false }
          : habit,
      ))
    },

    logCompletion: (id) => {
      const today = new Date().toISOString().split('T')[0]
      updateLocal((habits) => habits.map((habit) => {
        if (habit.id !== id) return habit
        const completedToday = habit.lastCompletedDate === today
        return {
          ...habit,
          progress: Math.min(1, habit.progress + 0.1),
          streak: completedToday ? habit.streak : habit.streak + 1,
          lastCompletedDate: today,
          updatedAt: new Date().toISOString(),
          synced: false,
        }
      }))
    },

    deleteHabit: (id) => {
      const now = new Date().toISOString()
      updateLocal((habits) => habits.map((habit) =>
        habit.id === id
          ? { ...habit, isDeleted: true, deletedAt: now, updatedAt: now, synced: false }
          : habit,
      ))
    },
  }
})
