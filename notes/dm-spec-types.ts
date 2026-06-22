// IsmailNow - Data Model Specifications (TypeScript Interfaces)
// Date: 2026-03-11
// This file defines the core data model interfaces for the offline-first RN plan.

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'custom'
export type RepeatPattern = 'daily' | 'weekly' | 'monthly' | 'custom'

export interface Habit {
  id: string
  name: string
  color?: string
  icon?: string
  frequency: Frequency
  startDate?: string // ISO date
  endDate?: string | null
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface Reminder {
  id: string
  habitId: string
  time: string // HH:mm in 24h format
  repeat?: RepeatPattern
  enabled?: boolean
  timezone?: string
  createdAt?: string
  updatedAt?: string
}

export interface HabitInstance {
  id: string
  habitId: string
  date: string // ISO date (YYYY-MM-DD)
  completed: boolean
  value?: number
  notes?: string
}

export interface HistoryEntry {
  id: string
  habitId: string
  date: string // ISO date
  value?: number
  note?: string
}

export interface UserProfile {
  id: string
  displayName?: string
  email?: string
  avatarUrl?: string
  createdAt?: string
}

export interface Settings {
  id: string
  notifyEnabled?: boolean
  remindBeforeMinutes?: number
  backupEnabled?: boolean
  backupFrequency?: 'daily' | 'weekly' | 'manual'
  locale?: string
  language?: string
}

export interface AppDataModel {
  habits: Habit[]
  reminders: Reminder[]
  history: HistoryEntry[]
  user?: UserProfile
  settings?: Settings
}

// Convenience partial types for patching/updating selectively
export type PartialHabit = Partial<Habit>
export type PartialReminder = Partial<Reminder>
export type PartialHabitInstance = Partial<HabitInstance>
export type PartialHistoryEntry = Partial<HistoryEntry>
export type PartialUserProfile = Partial<UserProfile>
export type PartialSettings = Partial<Settings>

export { Habit, Reminder, HabitInstance, HistoryEntry, UserProfile, Settings, AppDataModel }
