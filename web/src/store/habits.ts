import { create } from 'zustand'

export interface Habit {
  id: string
  name: string
  color: string
  progress: number
  streak: number
  lastCompletedDate?: string
}

interface HabitsStore {
  habits: Habit[]
  load: () => Promise<void>
  save: () => Promise<void>
  addHabit: (habit: Omit<Habit, 'id' | 'progress' | 'streak'>) => void
  updateHabit: (id: string, patch: Partial<Habit>) => void
  logCompletion: (id: string) => void
  deleteHabit: (id: string) => void
}

const STORAGE_KEY = 'habbitnow_habits_v1'

export const useHabitsStore = create<HabitsStore>((set) => ({
  habits: [],

  load: async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        set({ habits: parsed })
      } else {
        set({ habits: [] })
      }
    } catch (error) {
      console.error('Failed to load habits:', error)
      set({ habits: [] })
    }
  },

  save: async () => {
    try {
      set((state) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.habits))
        return state
      })
    } catch (error) {
      console.error('Failed to save habits:', error)
    }
  },

  addHabit: (habitData) => {
    const newHabit: Habit = {
      id: Math.random().toString(36).substr(2, 9),
      ...habitData,
      progress: 0,
      streak: 0,
    }
    set((state) => {
      const updated = [...state.habits, newHabit]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return { habits: updated }
    })
  },

  updateHabit: (id, patch) => {
    set((state) => {
      const updated = state.habits.map((h) =>
        h.id === id ? { ...h, ...patch } : h
      )
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return { habits: updated }
    })
  },

  logCompletion: (id) => {
    set((state) => {
      const today = new Date().toISOString().split('T')[0]
      const updated = state.habits.map((h) => {
        if (h.id === id) {
          const wasCompletedToday = h.lastCompletedDate === today
          return {
            ...h,
            progress: Math.min(1, h.progress + 0.1),
            streak: wasCompletedToday ? h.streak : h.streak + 1,
            lastCompletedDate: today,
          }
        }
        return h
      })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return { habits: updated }
    })
  },

  deleteHabit: (id) => {
    set((state) => {
      const updated = state.habits.filter((h) => h.id !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return { habits: updated }
    })
  },
}))
