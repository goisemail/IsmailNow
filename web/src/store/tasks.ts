import { create } from 'zustand'

export interface PendingTask {
  id: string
  title: string
  startDate: string
  createdAt: string
  completedDate?: string
}

interface TasksStore {
  tasks: PendingTask[]
  load: () => Promise<void>
  save: () => Promise<void>
  addTask: (title: string, startDate: string) => void
  toggleTaskCompletion: (id: string, date: string) => void
  deleteTask: (id: string) => void
}

const STORAGE_KEY = 'ismailnow_tasks_v1'

export const useTasksStore = create<TasksStore>((set) => ({
  tasks: [],

  load: async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        set({ tasks: parsed })
      } else {
        set({ tasks: [] })
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
      set({ tasks: [] })
    }
  },

  save: async () => {
    try {
      set((state) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks))
        return state
      })
    } catch (error) {
      console.error('Failed to save tasks:', error)
    }
  },

  addTask: (title, startDate) => {
    const newTask: PendingTask = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      startDate,
      createdAt: new Date().toISOString(),
    }
    set((state) => {
      const updated = [...state.tasks, newTask]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return { tasks: updated }
    })
  },

  toggleTaskCompletion: (id, date) => {
    set((state) => {
      const updated = state.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              completedDate: task.completedDate === date ? undefined : date,
            }
          : task
      )
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return { tasks: updated }
    })
  },

  deleteTask: (id) => {
    set((state) => {
      const updated = state.tasks.filter((t) => t.id !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return { tasks: updated }
    })
  },
}))
