# IsmailNow MVP Scope

Date: 2026-03-11
App: HabitNow APK

Overview
- Defines the official MVP scope for IsmailNow using a strict mono-repo, bare React Native approach with SQLite and Google Drive backups. This MVP is designed to be shipped as a local development-ready mobile app on iOS/Android devices via local builds.

Scope (core features)
- Offline-first data model and persistence using SQLite (habits, habit instances, reminders, history, settings, user profile).
- Core screens: Habits Dashboard, Habit Editor, History, Settings, and Backup settings.
- Local data access layer (DAO) with a minimal service layer to expose CRUD operations to UI.
- Navigation skeleton using React Navigation (stack-based flows for habit creation, editing, and history).
- Google Drive backup scaffold for CSV exports (Drive OAuth scaffolding and CSV export logic; actual Drive sign-in and upload implemented in Phase 2).
- Jest-based test scaffolding (unit tests for data layer and a couple of components).
- Design references: color palette, UI spec, and a starter design system (colors palette wired to plan).

Non-goals (for MVP clarity)
- Detox end-to-end tests (postponed to Phase 3/4).
- App Store deployment or CI/CD pipelines (local development only for MVP).
- Capacitor/PWA or Expo cloud builds (RN CLI bare baseline only).

Constraints and assumptions
- Platform: React Native CLI (Bare)
- Database: SQLite via react-native-sqlite-storage (or DAO wrapper)
- Online backups: Drive app data scope (OAuth scaffolding included in Phase 2)
- Tests: Jest-only now; Detox deferred

Success criteria (MVP)
- Local data layer is operable with basic CRUD for Habits, Reminders, History.
- UI can render the Habit Dashboard and Habit Editor with navigation to History.
- CSV export function is wired up and can be invoked to generate a CSV payload for the Drive backup flow.
- Drive integration scaffolding is in place to be activated in Phase 2.

Notes
- This MVP scope will be used to guide patch plans and onboarding tasks for developers once plan mode is lifted.
