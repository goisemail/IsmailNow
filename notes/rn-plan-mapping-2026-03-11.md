# IsmailNow React Native Plan — APK findings mapped (Canonical)

Date: 2026-03-11
App: habbitnow.apk

Overview
- This document maps the decoded APK findings to a concrete React Native plan for IsmailNow, covering data models, UI screens, navigation, offline-first storage, and Google Drive CSV backups.

1) APK findings to RN features mapping
- Habit management UI: create/edit habit, cadence, notes
- Reminders: schedule notifications/alarms
- History/Analytics: view progress over time
- Cloud backups: Google Drive CSV backups for portability
- Auth: Google Sign-In / identity flows (Post-MVP)
- Settings: user preferences, backup settings, notifications
- Premium/Offers: in-app purchase flows (Post-MVP)
- Backup & Restore: local backups and cloud backup flows
- Widgets: quick views / widget integration hints (Post-MVP)

2) Data model (RN draft)
- Habit: id, name, color, frequency, startDate, notes
- HabitInstance: id, habitId, date, status
- Reminder: id, habitId, time, repeat
- HistoryEntry: id, habitId, date, value
- UserProfile: id, displayName, email, preferences
- Settings: id, notifyPrefs, backupPrefs, syncPrefs

3) Core screens & navigation (high-level)
- Splash/Starting screen
- Onboarding flow (Post-MVP; auth if needed)
- Habits Dashboard (list/cards)
- Habit Editor (create/edit)
- Habit Details / History
- Reminders / Notifications settings
- Backup/Restore (local and Google Drive backups)
- Settings & Profile

4) Offline-first strategy (local storage)
- Choose local DB: SQLite for React Native
- Local CRUD for Habits, History, Reminders
- Sync plan: no backend API sync in MVP; rely on local storage plus CSV export scaffold and Drive OAuth scaffolding. Backend API sync is Post-MVP.

5) Google Drive CSV backup integration (online storage)
- Sign-in flow for Google account on iOS/Android
- CSV export of local data (habits, history, settings)
- Upload to Google Drive into a dedicated folder; optional scheduled backups
- Conflict resolution and token refresh handling in UI

6) iOS build considerations (local workflow)
- Build with Xcode on macOS, using a React Native CLI-based project (not Expo)
- Local code signing with Apple ID; deploy to connected iPhone
- Ensure proper entitlements for background tasks and notifications

7) Milestones (sample)
- Milestone 1: Core data model & offline layer (2–3 weeks)
- Milestone 2: UI scaffolding and navigation (2 weeks)
- Milestone 3: Reminders and notifications (1–2 weeks)
- Milestone 4: Google Drive CSV backup integration (2–3 weeks)
- Milestone 5: iOS local build & deployment (1–2 weeks)

8) Risks & mitigations
- Android APK specifics vs RN parity: mapping gaps; mitigate by iterative feature parity checks
- Google Drive OAuth management: handle token refresh and scopes securely
- Local DB migration: plan for future data migrations when backend requirements evolve

9) Next steps
- Create a starter RN project scaffold aligned to the plan
- Define an initial data model schema file (TypeScript interfaces)
- Create a basic navigation map and skeleton screens
- Outline a minimal Google Drive CSV backup flow (mocked initially)

Notes
- This plan is living and will be updated as APK findings are refined and decisions are made.
- MVP source of truth: plan-2026-03-11.md
