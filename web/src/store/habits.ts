import { create } from 'zustand'
import { accountStorageKey } from '../lib/accountStorage'

export interface Habit {
  id: string
  name: string
  color: string
  progress: number
  streak: number
  lastCompletedDate?: string
}

interface HabitsStore {
  ownerId: string | null
  habits: Habit[]
  error: string | null
  load: (ownerId: string) => Promise<void>
  save: () => Promise<void>
  clearMemory: () => void
  addHabit: (habit: Omit<Habit, 'id' | 'progress' | 'streak'>) => void
  updateHabit: (id: string, patch: Partial<Habit>) => void
  logCompletion: (id: string) => void
  deleteHabit: (id: string) => void
}

export const useHabitsStore = create<HabitsStore>((set, get) => {
  const persist = (ownerId: string, habits: Habit[]): string | null => {
    try {
      localStorage.setItem(accountStorageKey(ownerId, 'habits'), JSON.stringify(habits))
      return null
    } catch {
      return 'Habit changes could not be saved in this browser.'
    }
  }

  const updateLocal = (transform: (habits: Habit[]) => Habit[]): void => {
    set((state) => {
      if (!state.ownerId) return state
      const habits = transform(state.habits)
      return { habits, error: persist(state.ownerId, habits) }
    })
  }

  return {
    ownerId: null,
    habits: [],
    error: null,

    load: async (ownerId) => {
      try {
        const stored = localStorage.getItem(accountStorageKey(ownerId, 'habits'))
        set({ ownerId, habits: stored ? (JSON.parse(stored) as Habit[]) : [], error: null })
      } catch {
        set({ ownerId, habits: [], error: 'Saved habits could not be loaded.' })
      }
    },

    save: async () => {
      const state = get()
      if (!state.ownerId) return
      set({ error: persist(state.ownerId, state.habits) })
    },

    clearMemory: () => set({ ownerId: null, habits: [], error: null }),

    addHabit: (habitData) => {
      const habit: Habit = {
        id: Math.random().toString(36).slice(2, 11),
        ...habitData,
        progress: 0,
        streak: 0,
      }
      updateLocal((habits) => [...habits, habit])
    },

    updateHabit: (id, patch) => {
      updateLocal((habits) => habits.map((habit) =>
        habit.id === id ? { ...habit, ...patch } : habit,
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
        }
      }))
    },

    deleteHabit: (id) => updateLocal((habits) => habits.filter((habit) => habit.id !== id)),
  }
})
