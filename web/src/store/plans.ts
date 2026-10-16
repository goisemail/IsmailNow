import { create } from 'zustand'
import { accountStorageKey } from '../lib/accountStorage'

export interface PendingPlan {
  id: string
  title: string
  startDate: string
  startTime: string
  endTime: string
  endDate?: string | null
  isRepeating?: boolean
  repeatDays?: number[] | null
  linkedTaskId?: string | null
  linkedTaskIds?: string[] | null
  linkedHabitId?: string | null
  createdAt: string
  updatedAt: string
  synced: boolean
}

export interface PlanDraft {
  title: string
  startDate: string
  startTime: string
  endTime: string
  endDate?: string | null
  isRepeating?: boolean
  repeatDays?: number[] | null
  linkedTaskId?: string | null
  linkedTaskIds?: string[] | null
  linkedHabitId?: string | null
}

interface PlansStore {
  ownerId: string | null
  plans: PendingPlan[]
  error: string | null
  volatile: boolean
  load: (ownerId: string) => void
  clearMemory: () => void
  hasPendingChanges: () => boolean
  hasVolatileChanges: () => boolean
  retryPersistence: () => boolean
  addPlan: (draft: PlanDraft) => string
  updatePlanLinks: (id: string, links: { linkedTaskId?: string | null; linkedTaskIds?: string[] | null; linkedHabitId?: string | null }) => void
  applySyncResult: (plans: PendingPlan[]) => void
}

function loadFromStorage(ownerId: string): PendingPlan[] {
  const raw = localStorage.getItem(accountStorageKey(ownerId, 'plans'))
  return raw ? (JSON.parse(raw) as PendingPlan[]) : []
}

function saveToStorage(ownerId: string, plans: PendingPlan[]): void {
  localStorage.setItem(accountStorageKey(ownerId, 'plans'), JSON.stringify(plans))
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function normalizeTaskIds(ids: unknown): string[] | null {
  if (!Array.isArray(ids)) return null
  const valid = ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
  return valid.length > 0 ? valid : null
}

function normalizeRepeatDays(days: unknown): number[] | null {
  if (!Array.isArray(days)) return null
  const valid = days
    .filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((left, right) => left - right)
  return valid.length > 0 ? valid : null
}

export function normalizePlan(plan: PendingPlan): PendingPlan {
  return {
    ...plan,
    endDate: plan.endDate ?? null,
    isRepeating: plan.isRepeating === true,
    repeatDays: normalizeRepeatDays(plan.repeatDays),
    linkedTaskId: plan.linkedTaskId ?? null,
    linkedTaskIds: normalizeTaskIds(plan.linkedTaskIds),
    linkedHabitId: plan.linkedHabitId ?? null,
    synced: plan.synced !== false,
  }
}

export function mergePlans(localPlans: PendingPlan[], remotePlans: PendingPlan[]): PendingPlan[] {
  const byId = new Map<string, PendingPlan>()

  for (const plan of remotePlans) byId.set(plan.id, normalizePlan({ ...plan, synced: true }))
  for (const plan of localPlans) {
    const localPlan = normalizePlan(plan)
    const existing = byId.get(localPlan.id)
    if (!existing || localPlan.updatedAt > existing.updatedAt) {
      byId.set(localPlan.id, localPlan)
    } else if (localPlan.updatedAt === existing.updatedAt) {
      byId.set(localPlan.id, { ...existing, synced: existing.synced && localPlan.synced })
    }
  }

  return Array.from(byId.values()).sort((left, right) =>
    left.startDate.localeCompare(right.startDate) || left.startTime.localeCompare(right.startTime))
}

export const usePlansStore = create<PlansStore>((set, get) => {
  const persist = (ownerId: string, plans: PendingPlan[]): boolean => {
    try {
      saveToStorage(ownerId, plans)
      return true
    } catch {
      return false
    }
  }

  return {
    ownerId: null,
    plans: [],
    error: null,
    volatile: false,

    load: (ownerId) => {
      try {
        set({
          ownerId,
          plans: loadFromStorage(ownerId).map(normalizePlan),
          error: null,
          volatile: false,
        })
      } catch {
        set({ ownerId, plans: [], error: 'Saved plans could not be loaded.', volatile: false })
      }
    },

    clearMemory: () => {
      set({ ownerId: null, plans: [], error: null, volatile: false })
    },

    hasPendingChanges: () => get().plans.some((plan) => !plan.synced),

    hasVolatileChanges: () => get().volatile,

    retryPersistence: () => {
      const state = get()
      if (!state.ownerId) return true
      const persisted = persist(state.ownerId, state.plans)
      set({
        volatile: !persisted,
        error: persisted ? null : 'Changes could not be saved in this browser.',
      })
      return persisted
    },

    addPlan: (draft) => {
      const id = generateId()
      const now = new Date().toISOString()
      const plan: PendingPlan = {
        id,
        title: draft.title.trim(),
        startDate: draft.startDate,
        startTime: draft.startTime,
        endTime: draft.endTime,
        endDate: draft.isRepeating ? (draft.endDate ?? null) : null,
        isRepeating: draft.isRepeating === true,
        repeatDays: draft.isRepeating ? normalizeRepeatDays(draft.repeatDays) : null,
        linkedTaskId: draft.linkedTaskId ?? null,
        linkedHabitId: draft.linkedHabitId ?? null,
        createdAt: now,
        updatedAt: now,
        synced: false,
      }
      const ownerId = get().ownerId
      if (!ownerId) return id
      const plans = [...get().plans, plan]
      const persisted = persist(ownerId, plans)
      set({
        plans,
        volatile: !persisted,
        error: persisted ? null : 'Changes could not be saved in this browser.',
      })
      return id
    },

  updatePlanLinks: (id, links) => {
    const ownerId = get().ownerId
    if (!ownerId) return
    const plans = get().plans.map((plan) => plan.id === id
      ? {
        ...plan,
        ...(links.linkedTaskId !== undefined ? { linkedTaskId: links.linkedTaskId } : {}),
        ...(links.linkedTaskIds !== undefined ? { linkedTaskIds: links.linkedTaskIds } : {}),
        ...(links.linkedHabitId !== undefined ? { linkedHabitId: links.linkedHabitId } : {}),
        updatedAt: new Date().toISOString(),
        synced: false,
      }
      : plan)
      const persisted = persist(ownerId, plans)
      set({
        plans,
        volatile: !persisted,
        error: persisted ? null : 'Changes could not be saved in this browser.',
      })
    },

    applySyncResult: (plans) => {
      const ownerId = get().ownerId
      if (!ownerId) return
      const persisted = persist(ownerId, plans)
      set({
        plans,
        volatile: !persisted,
        error: persisted ? null : 'Changes could not be saved in this browser.',
      })
    },
  }
})
