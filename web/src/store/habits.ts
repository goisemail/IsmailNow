import { create } from 'zustand'
import { accountStorageKey } from '../lib/accountStorage'

export type HabitEntryState = 'completed' | 'failed' | 'inProgress' | 'skipped'

export type HabitEvaluation =
  | { type: 'binary' }
  | {
      type: 'counter'
      criterion: 'atLeast' | 'atMost' | 'exactly' | 'any'
      target: number
      unit?: string
    }

export type HabitSchedule =
  | { type: 'everyDay' }
  | { type: 'weekdays'; weekdays: number[] }

export interface Habit {
  id: string
  name: string
  description?: string
  color: string
  category: string
  priority: number
  evaluation: HabitEvaluation
  schedule: HabitSchedule
  startDate: string
  endDate?: string
  archivedAt?: string
  createdAt: string
  updatedAt: string
  synced: boolean
  isDeleted?: boolean
  deletedAt?: string
}

export interface HabitEntry {
  id: string
  habitId: string
  date: string
  state: HabitEntryState
  value?: number
  targetSnapshot?: number
  note?: string
  createdAt: string
  updatedAt: string
  synced: boolean
  isDeleted?: boolean
  deletedAt?: string
}

export interface HabitDraft {
  name: string
  description?: string
  color: string
  category?: string
  priority?: number
  evaluation?: HabitEvaluation
  schedule?: HabitSchedule
  startDate?: string
  endDate?: string
}

export interface HabitStats {
  currentStreak: number
  bestStreak: number
  completed: number
  failed: number
  skipped: number
  successRate: number
  totalValue: number
}

interface HabitsStore {
  ownerId: string | null
  habits: Habit[]
  entries: HabitEntry[]
  error: string | null
  volatile: boolean
  load: (ownerId: string) => Promise<void>
  save: () => Promise<void>
  clearMemory: () => void
  hasPendingChanges: () => boolean
  hasVolatileChanges: () => boolean
  retryPersistence: () => boolean
  applySyncResult: (habits: Habit[], entries?: HabitEntry[]) => void
  addHabit: (habit: HabitDraft) => void
  updateHabit: (id: string, patch: Partial<HabitDraft>) => void
  logCompletion: (id: string, date?: string) => void
  setEntryState: (id: string, date: string, state: HabitEntryState, value?: number) => void
  resetEntry: (id: string, date: string) => void
  archiveHabit: (id: string, archived: boolean) => void
  resetProgress: (id: string) => void
  deleteHabit: (id: string) => void
}

const DEFAULT_COLOR = '#E72372'

export function todayLocal(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function generateId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
}

function updatedTimestamp(previous?: string): string {
  const now = new Date().toISOString()
  if (!previous || now > previous) return now
  return new Date(new Date(previous).getTime() + 1).toISOString()
}

function normalizeHabit(raw: Habit | Record<string, unknown>): Habit {
  const habit = raw as Partial<Habit> & {
    progress?: number
    streak?: number
    lastCompletedDate?: string
  }
  const now = new Date().toISOString()
  const createdAt = habit.createdAt || habit.updatedAt || now
  return {
    id: habit.id || generateId(),
    name: habit.name?.trim() || 'Untitled habit',
    description: habit.description,
    color: habit.color || DEFAULT_COLOR,
    category: habit.category || 'Other',
    priority: Number.isFinite(habit.priority) ? Number(habit.priority) : 0,
    evaluation: habit.evaluation ?? { type: 'counter', criterion: 'atLeast', target: 10 },
    schedule: habit.schedule ?? { type: 'everyDay' },
    startDate: habit.startDate || createdAt.slice(0, 10),
    endDate: habit.endDate,
    archivedAt: habit.archivedAt,
    createdAt,
    updatedAt: habit.updatedAt || createdAt,
    synced: habit.synced !== false,
    isDeleted: habit.isDeleted,
    deletedAt: habit.deletedAt,
  }
}

function normalizeEntry(entry: HabitEntry): HabitEntry {
  return { ...entry, synced: entry.synced !== false }
}

function legacyEntries(rawHabits: Array<Record<string, unknown>>, normalized: Habit[]): HabitEntry[] {
  return rawHabits.flatMap((raw, index) => {
    const progress = typeof raw.progress === 'number' ? raw.progress : 0
    const date = typeof raw.lastCompletedDate === 'string' ? raw.lastCompletedDate : undefined
    if (!date || progress <= 0) return []
    const habit = normalized[index]
    const value = Math.max(1, Math.round(progress * 10))
    const now = habit.updatedAt
    return [{
      id: `${habit.id}:${date}`,
      habitId: habit.id,
      date,
      state: value >= 10 ? 'completed' as const : 'inProgress' as const,
      value,
      targetSnapshot: 10,
      createdAt: now,
      updatedAt: now,
      synced: false,
    }]
  })
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
  return Array.from(byId.values()).sort((a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt))
}

export function mergeHabitEntries(local: HabitEntry[], remote: HabitEntry[]): HabitEntry[] {
  const byId = new Map<string, HabitEntry>()
  for (const entry of remote) byId.set(entry.id, normalizeEntry({ ...entry, synced: true }))
  for (const entry of local) {
    const existing = byId.get(entry.id)
    if (!existing || entry.updatedAt > existing.updatedAt) byId.set(entry.id, normalizeEntry(entry))
    else if (entry.updatedAt === existing.updatedAt) {
      byId.set(entry.id, { ...existing, synced: existing.synced && entry.synced })
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
}

export function habitIsDueOnDate(habit: Habit, date: string): boolean {
  if (
    habit.isDeleted ||
    date < habit.startDate ||
    (habit.endDate && date > habit.endDate) ||
    (habit.archivedAt && date >= habit.archivedAt.slice(0, 10))
  ) return false
  if (habit.schedule.type === 'everyDay') return true
  const weekday = new Date(`${date}T12:00:00`).getDay()
  return habit.schedule.weekdays.includes(weekday)
}

export function getHabitEntry(entries: HabitEntry[], habitId: string, date: string): HabitEntry | undefined {
  return entries.find((entry) => entry.habitId === habitId && entry.date === date && !entry.isDeleted)
}

function previousDate(date: string): string {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() - 1)
  return value.toISOString().slice(0, 10)
}

function nextDate(date: string): string {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + 1)
  return value.toISOString().slice(0, 10)
}

export function getHabitStats(habit: Habit, entries: HabitEntry[], throughDate = todayLocal()): HabitStats {
  const today = todayLocal()
  const cutoff = throughDate < today ? throughDate : today
  const relevant = entries.filter((entry) => entry.habitId === habit.id && !entry.isDeleted && entry.date <= cutoff)
  const byDate = new Map(relevant.map((entry) => [entry.date, entry]))
  let completed = 0
  let failed = 0
  let skipped = 0
  let bestStreak = 0
  let runningStreak = 0
  let date = habit.startDate
  for (let checked = 0; checked < 36_525 && date <= cutoff; checked += 1) {
    if (habitIsDueOnDate(habit, date)) {
      const entry = byDate.get(date)
      if (entry?.state === 'completed') {
        completed += 1
        runningStreak += 1
        bestStreak = Math.max(bestStreak, runningStreak)
      } else if (entry?.state === 'skipped') {
        skipped += 1
      } else if (date < today || entry?.state === 'failed') {
        failed += 1
        runningStreak = 0
      }
    }
    date = nextDate(date)
  }

  let currentStreak = 0
  let cursor = cutoff
  for (let checked = 0; checked < 36_525 && cursor >= habit.startDate; checked += 1) {
    if (!habitIsDueOnDate(habit, cursor)) {
      cursor = previousDate(cursor)
      continue
    }
    const entry = byDate.get(cursor)
    if (entry?.state === 'completed') currentStreak += 1
    else if (entry?.state !== 'skipped' && (cursor < today || entry?.state === 'failed')) break
    cursor = previousDate(cursor)
  }
  const denominator = completed + failed
  return {
    currentStreak,
    bestStreak,
    completed,
    failed,
    skipped,
    successRate: denominator ? Math.round((completed / denominator) * 100) : 0,
    totalValue: relevant.reduce((total, entry) => total + (entry.value ?? 0), 0),
  }
}

export const useHabitsStore = create<HabitsStore>((set, get) => {
  const persist = (ownerId: string, habits: Habit[], entries: HabitEntry[]): boolean => {
    try {
      localStorage.setItem(accountStorageKey(ownerId, 'habits'), JSON.stringify(habits))
      localStorage.setItem(accountStorageKey(ownerId, 'habitEntries'), JSON.stringify(entries))
      return true
    } catch {
      return false
    }
  }

  const commit = (habits: Habit[], entries: HabitEntry[]): void => {
    const ownerId = get().ownerId
    if (!ownerId) return
    const persisted = persist(ownerId, habits, entries)
    set({ habits, entries, volatile: !persisted, error: persisted ? null : 'Habit changes could not be saved in this browser.' })
  }

  return {
    ownerId: null,
    habits: [],
    entries: [],
    error: null,
    volatile: false,

    load: async (ownerId) => {
      try {
        const storedHabits = localStorage.getItem(accountStorageKey(ownerId, 'habits'))
        const rawHabits = storedHabits ? JSON.parse(storedHabits) as Array<Record<string, unknown>> : []
        const habits = rawHabits.map(normalizeHabit)
        const storedEntries = localStorage.getItem(accountStorageKey(ownerId, 'habitEntries'))
        const entries = storedEntries
          ? (JSON.parse(storedEntries) as HabitEntry[]).map(normalizeEntry)
          : legacyEntries(rawHabits, habits)
        set({ ownerId, habits, entries, error: null, volatile: false })
        if (!storedEntries && entries.length) persist(ownerId, habits, entries)
      } catch {
        set({ ownerId, habits: [], entries: [], error: 'Saved habits could not be loaded.', volatile: false })
      }
    },

    save: async () => {
      const state = get()
      if (!state.ownerId) return
      const persisted = persist(state.ownerId, state.habits, state.entries)
      set({ volatile: !persisted, error: persisted ? null : 'Habit changes could not be saved in this browser.' })
    },

    clearMemory: () => set({ ownerId: null, habits: [], entries: [], error: null, volatile: false }),
    hasPendingChanges: () => get().habits.some((habit) => !habit.synced) || get().entries.some((entry) => !entry.synced),
    hasVolatileChanges: () => get().volatile,

    retryPersistence: () => {
      const state = get()
      if (!state.ownerId) return true
      const persisted = persist(state.ownerId, state.habits, state.entries)
      set({ volatile: !persisted, error: persisted ? null : 'Habit changes could not be saved in this browser.' })
      return persisted
    },

    applySyncResult: (habits, entries = get().entries) => commit(habits, entries),

    addHabit: (draft) => {
      const now = new Date().toISOString()
      const habit: Habit = normalizeHabit({
        id: generateId(),
        name: draft.name,
        description: draft.description,
        color: draft.color,
        category: draft.category || 'Other',
        priority: draft.priority ?? 0,
        evaluation: draft.evaluation ?? { type: 'binary' },
        schedule: draft.schedule ?? { type: 'everyDay' },
        startDate: draft.startDate || todayLocal(),
        endDate: draft.endDate,
        createdAt: now,
        updatedAt: now,
        synced: false,
      } as Habit)
      commit([...get().habits, habit], get().entries)
    },

    updateHabit: (id, patch) => {
      commit(get().habits.map((habit) => habit.id === id
        ? normalizeHabit({ ...habit, ...patch, updatedAt: updatedTimestamp(habit.updatedAt), synced: false })
        : habit), get().entries)
    },

    logCompletion: (id, date = todayLocal()) => {
      const habit = get().habits.find((candidate) => candidate.id === id)
      if (!habit || !habitIsDueOnDate(habit, date) || date > todayLocal()) return
      const existing = getHabitEntry(get().entries, id, date)
      const now = updatedTimestamp(existing?.updatedAt)
      let next: HabitEntry
      if (habit.evaluation.type === 'binary') {
        next = {
          id: `${id}:${date}`,
          habitId: id,
          date,
          state: existing?.state === 'completed' ? 'failed' : 'completed',
          value: existing?.state === 'completed' ? 0 : 1,
          targetSnapshot: 1,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          synced: false,
        }
      } else {
        const target = habit.evaluation.target
        const value = (existing?.value ?? 0) + 1
        const complete = habit.evaluation.criterion === 'any' ||
          (habit.evaluation.criterion === 'atLeast' && value >= target) ||
          (habit.evaluation.criterion === 'exactly' && value === target) ||
          (habit.evaluation.criterion === 'atMost' && value <= target)
        const failed = (habit.evaluation.criterion === 'exactly' || habit.evaluation.criterion === 'atMost') && value > target
        next = {
          id: `${id}:${date}`,
          habitId: id,
          date,
          state: complete ? 'completed' : failed ? 'failed' : 'inProgress',
          value,
          targetSnapshot: target,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          synced: false,
        }
      }
      commit(get().habits, mergeHabitEntries([next], get().entries))
    },

    setEntryState: (id, date, state, value) => {
      const habit = get().habits.find((candidate) => candidate.id === id)
      if (!habit || !habitIsDueOnDate(habit, date) || date > todayLocal()) return
      const existing = getHabitEntry(get().entries, id, date)
      const now = updatedTimestamp(existing?.updatedAt)
      const target = habit.evaluation.type === 'binary' ? 1 : habit.evaluation.target
      const entry: HabitEntry = {
        id: `${id}:${date}`,
        habitId: id,
        date,
        state,
        value: value ?? (state === 'completed' ? target : 0),
        targetSnapshot: target,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        synced: false,
      }
      commit(get().habits, mergeHabitEntries([entry], get().entries))
    },

    resetEntry: (id, date) => {
      commit(get().habits, get().entries.map((entry) => {
        if (entry.habitId !== id || entry.date !== date) return entry
        const now = updatedTimestamp(entry.updatedAt)
        return { ...entry, isDeleted: true, deletedAt: now, updatedAt: now, synced: false }
      }))
    },

    archiveHabit: (id, archived) => {
      commit(get().habits.map((habit) => {
        if (habit.id !== id) return habit
        const now = updatedTimestamp(habit.updatedAt)
        return { ...habit, archivedAt: archived ? now : undefined, updatedAt: now, synced: false }
      }), get().entries)
    },

    resetProgress: (id) => {
      commit(get().habits, get().entries.map((entry) => {
        if (entry.habitId !== id || entry.isDeleted) return entry
        const now = updatedTimestamp(entry.updatedAt)
        return { ...entry, isDeleted: true, deletedAt: now, updatedAt: now, synced: false }
      }))
    },

    deleteHabit: (id) => {
      const habits = get().habits.map((habit) => {
        if (habit.id !== id) return habit
        const now = updatedTimestamp(habit.updatedAt)
        return { ...habit, isDeleted: true, deletedAt: now, updatedAt: now, synced: false }
      })
      const entries = get().entries.map((entry) => {
        if (entry.habitId !== id) return entry
        const now = updatedTimestamp(entry.updatedAt)
        return { ...entry, isDeleted: true, deletedAt: now, updatedAt: now, synced: false }
      })
      commit(habits, entries)
    },
  }
})
