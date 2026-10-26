import { create } from 'zustand'
import { accountStorageKey } from '../lib/accountStorage'

export type PlannerView = 'day' | 'week' | 'month'

interface SettingsState {
  ownerId: string | null
  defaultPlannerView: PlannerView
  load: (ownerId: string) => void
  clearMemory: () => void
  setDefaultPlannerView: (view: PlannerView) => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ownerId: null,
  defaultPlannerView: 'day',

  load: (ownerId) => {
    const raw = localStorage.getItem(accountStorageKey(ownerId, 'plannerSettings'))
    let defaultView: PlannerView = 'day'
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (parsed.defaultPlannerView && ['day', 'week', 'month'].includes(parsed.defaultPlannerView)) {
          defaultView = parsed.defaultPlannerView as PlannerView
        }
      } catch {
        // ignore malformed storage, fall back to default
      }
    }
    set({ ownerId, defaultPlannerView: defaultView })
  },

  clearMemory: () => {
    set({ ownerId: null, defaultPlannerView: 'day' })
  },

  setDefaultPlannerView: (view) => {
    const ownerId = get().ownerId
    if (!ownerId) return
    set({ defaultPlannerView: view })
    localStorage.setItem(
      accountStorageKey(ownerId, 'plannerSettings'),
      JSON.stringify({ defaultPlannerView: view }),
    )
  },
}))
