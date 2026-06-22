import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';

export type PendingTask = {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  createdAt: string;
  completedDate?: string; // YYYY-MM-DD
};

export const TASKS_STORAGE_KEY = 'ismailnow_tasks_v1';

type TasksState = {
  tasks: PendingTask[];
  load: () => Promise<void>;
  save: () => Promise<void>;
  addTask: (title: string, startDate: string) => void;
  toggleTaskCompletion: (id: string, selectedDate: string) => void;
};

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
      if (!raw) {
        set({tasks: []});
        return;
      }
      const parsed = JSON.parse(raw) as PendingTask[];
      set({tasks: parsed});
    } catch (error) {
      console.error('Failed to load tasks', error);
    }
  },
  save: async () => {
    try {
      await AsyncStorage.setItem(
        TASKS_STORAGE_KEY,
        JSON.stringify(get().tasks),
      );
    } catch (error) {
      console.error('Failed to save tasks', error);
    }
  },
  addTask: (title, startDate) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      return;
    }
    const next: PendingTask = {
      id: `t_${Date.now()}`,
      title: cleanTitle,
      startDate,
      createdAt: new Date().toISOString(),
    };
    set(state => ({tasks: [next, ...state.tasks]}));
    get().save();
  },
  toggleTaskCompletion: (id, selectedDate) => {
    set(state => {
      const updated = state.tasks.map(task => {
        if (task.id !== id) {
          return task;
        }
        if (task.completedDate === selectedDate) {
          return {...task, completedDate: undefined};
        }
        return {...task, completedDate: selectedDate};
      });
      return {tasks: updated};
    });
    get().save();
  },
}));
