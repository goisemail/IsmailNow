# Feature Map (IsmailNow)

- Habit Editor & Cadence
  - APK Finding: 3.1 Habit Editor & Cadence (Requirements)
  - RN Feature: Habits Editor UI, Cadence configuration, Per-habit Notes, Color/Icon picker, Reminders
  - Acceptance: Create/Edit habit, cadence, notes; persistence via SQLite; navigate Habit Details

- Reminders & Notifications
  - APK Finding: 3.2 Reminders & Notifications
  - RN Feature: Reminder creation/editing; per-habit reminders; local notifications
  - Acceptance: Create/Edit/Delete/Enable reminders; local notifications trigger; offline persistence

- History & Analytics
  - APK Finding: 3.3 History & Analytics
  - RN Feature: History screen; analytics dashboards; date-range filtering; per-habit/history context
  - Acceptance: History view for habit(s); metrics (completion rate, streaks); offline persistence

- Cloud Backups (Drive CSV scaffold)
  - APK Finding: Drive backup scaffolding; Phase 4 planned
  - RN Feature: CSV export scaffold; Drive OAuth scaffolding (Phase 2/4)
  - Acceptance: CSV export path stub; OAuth scaffolding present; no Drive upload in MVP

- Onboarding & Settings
  - APK Finding: Settings screen; backups; localization
  - RN Feature: Settings screen; i18n readiness; backup preferences
  - Acceptance: Basic settings persisted; locale-aware UI (MVP scope)

- Cross-cutting: Offline-first data layer
  - Data: Core entities aligned with TS DM-spec-types.ts
  - Persistence: SQLite; local-only MVP data layer
