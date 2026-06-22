import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';

export type Habit = {
  id: string;
  name: string;
  color: string;
  progress: number; // 0..1
  streak: number;
  lastCompletedDate?: string; // YYYY-MM-DD
};

export const HABITS_STORAGE_KEY = 'habbitnow_habits_v1';

type State = {
  habits: Habit[];
  load: () => Promise<void>;
  save: () => Promise<void>;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  addHabit: (h: Habit) => void;
  logCompletion: (id: string) => void;
};

export const useHabitsStore = create<State>((set, get) => ({
  habits: [],
  load: async () => {
    try {
      const s = await AsyncStorage.getItem(HABITS_STORAGE_KEY);
      if (s) {
        const parsed = JSON.parse(s) as Habit[];
        set({habits: parsed});
        return;
      }
      // seed data if none stored
      const seed: Habit[] = [
        {
          id: 'h1',
          name: 'Morning Run',
          color: '#10B981',
          progress: 0.42,
          streak: 5,
        },
        {
          id: 'h2',
          name: 'Read 20m',
          color: '#F59E0B',
          progress: 0.75,
          streak: 12,
        },
        {
          id: 'h3',
          name: 'Water Intake',
          color: '#3B82F6',
          progress: 0.25,
          streak: 3,
        },
      ];
      set({habits: seed});
      await AsyncStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(seed));
    } catch (e) {
      console.error('Failed to load habits', e);
    }
  },
  save: async () => {
    try {
      const s = JSON.stringify(get().habits);
      await AsyncStorage.setItem(HABITS_STORAGE_KEY, s);
    } catch (e) {
      console.error('Failed to save habits', e);
    }
  },
  updateHabit: (id, patch) => {
    set(state => {
      const updated = state.habits.map(h =>
        h.id === id ? {...h, ...patch} : h,
      );
      return {habits: updated};
    });
    // Persist after update
    get().save();
  },
  addHabit: h => {
    set(state => ({habits: [...state.habits, h]}));
    get().save();
  },
  logCompletion: id => {
    set(state => {
      const today = new Date().toISOString().slice(0, 10);
      const updated = state.habits.map(h => {
        if (h.id !== id) {
          return h;
        }
        const lastDate = h.lastCompletedDate?.slice(0, 10);
        const isNewDay = lastDate !== today;
        const newStreak = isNewDay ? h.streak + 1 : h.streak;
        const newProgress = Math.min(1, h.progress + (isNewDay ? 0.1 : 0));
        return {
          ...h,
          progress: newProgress,
          streak: newStreak,
          lastCompletedDate: today,
        };
      });
      return {habits: updated};
    });
    get().save();
  },
}));
