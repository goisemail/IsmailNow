-# APK Crosswalk (IsmailNow) — Dedicated Documentation

Date: 2026-03-11
App: HabitNow.apk

Purpose
- Provide a dedicated, centralized traceability document that maps APK findings to the React Native MVP documentation (DB schema, UI navigation, data models, and analytics).

APK Findings (high level)
- Core data model hints: Habit, Reminder, HabitInstance, HistoryEntry, UserProfile, Settings
- Core UI/navigation signals: Habit Dashboard, Habit Editor, Habit Details, Reminders, History/Analytics, Settings
- Cloud backup hint: Drive CSV export scaffold (Phase 4)
- Permissions & platform signals: POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, SCHEDULE_EXACT_ALARM, FOREGROUND_SERVICE, INTERNET, WAKE_LOCK
- Theming cues: pink/dark theme; AppThemePinkDark; color tokens in colors.xml
- Widgets and background services for alarms/timers

Crosswalk Mappings (APK Findings -> RN MVP docs)
- Habit Editor & Cadence
  - APK Finding: UI screens for habit creation/editing, cadence configuration, notes
  - RN Feature: Habit Editor, Cadence settings, Habit notes
  - Docs cross: 3.1 Habit Editor & Cadence, data_model.md, ui_navigation.md, dm-spec-types.ts
- Reminders & Notifications
  - APK Finding: Alarm/Notification entries; local reminder scheduling signals
  - RN Feature: Reminders UI; local notifications; enable/disable per reminder
  - Docs cross: 3.2 Reminders & Notifications, data_model.md, history_analytics_data_model.md, ui_navigation.md
- History & Analytics
  - APK Finding: History/Analytics screens inferred; flows for history and simple charts
  - RN Feature: History screen; analytics dashboard; date range filters
  - Docs cross: 3.3 History & Analytics, history_analytics_data_model.md, data_model.md
- Cloud backups (Drive CSV)
  - APK Finding: Drive CSV backups scaffold; Phase 4 planned
  - RN Feature: CSV export scaffold; OAuth scaffolding (Phase 2/4)
  - Docs cross:  apk-analysis-2026-03-11.md (Drive backup scaffold)
- Settings & permissions
  - APK Finding: Permissions for notifications, boot, internet, etc.
  - RN Feature: Settings screen; permission prompts; backup preferences
  - Docs cross: apk-analysis-2026-03-11.md (permissions), ui_navigation.md
- Theming & accessibility
  - APK Finding: Pink/dark theme vibe; color tokens present
  - RN Mapping: AppThemePinkDark, color tokens; accessibility notes in navigation doc

Gaps & Next Actions
- Consolidated crosswalk needs a single reference doc for end-to-end traceability (this file serves that role going forward).
- Patch plan to include: db_schema crosswalk, i18n plan, security plan, and migration plan as separate docs.

References (docs linked in plan)
- DB schema: /Users/goisemail/base/habbitNow/habbitNow/IsmailNow/notes/db_schema.md
- UI navigation: /Users/goisemail/base/habbitNow/habbitNow/IsmailNow/notes/ui_navigation.md
- Data model (TypeScript): /Users/goisemail/base/habbitNow/habbitNow/IsmailNow/notes/dm-spec-types.ts
- History & Analytics data model: /Users/goisemail/base/habbitNow/habbitNow/IsmailNow/notes/history_analytics_data_model.md
- APK analysis: /Users/goisemail/base/habbitNow/habbitNow/IsmailNow/notes/apk-analysis-2026-03-11.md
- Feature maps: /Users/goisemail/base/habbitNow/habbitNow/IsmailNow/notes/feature_map.md
- Provide a consolidated crosswalk from APK findings to the React Native (RN) MVP plan docs, to guide reconstruction and ensure parity.

APK Findings (high-level, aligned to core RN MVP features)
- Data model hints: Habit, Reminder, HabitInstance, HistoryEntry, UserProfile, Settings
- Core UI/navigation signals: Habit Dashboard, Habit Editor, Habit Details, Reminders, History/Analytics, Settings
- Cloud backup hint: Drive CSV export scaffold (Phase 4)
- Permissions: POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, SCHEDULE_EXACT_ALARM, FOREGROUND_SERVICE, INTERNET, WAKE_LOCK
- Integrations: Google Sign-In (Post-MVP), Firebase Crashlytics/Analytics, Google Analytics, Play Billing (Post-MVP)
- Theme cues: pink/dark theme; AppThemePinkDark; color tokens in colors.xml
- Widgets and background services for alarms/timers

Crosswalk Mappings (APK Findings -> RN MVP docs)
- Habit Editor & Cadence
  - APK Finding: UI screens for habit creation/editing, cadence configuration, notes
  - RN Feature: Habit Editor, Cadence configuration, Habit notes
  - Documentation mapping: 3.1 Habit Editor & Cadence (apk-analysis-2026-03-11.md), data_model.md, ui_navigation.md, dm-spec-types.ts

- Reminders & Notifications
  - APK Finding: Alarm/Notification entries; local reminder scheduling signals
  - RN Feature: Reminders UI; local notifications; enable/disable per reminder
  - Documentation mapping: 3.2 Reminders & Notifications,  data_model.md, history analytics crosswalk, ui_navigation.md

- History & Analytics
  - APK Finding: History/Analytics screens inferred; flows for history and simple charts
  - RN Feature: History screen; analytics dashboard; date range filters
  - Documentation mapping: 3.3 History & Analytics, history_analytics_data_model.md, data_model.md

- Cloud backups (Drive CSV)
  - APK Finding: Drive CSV backups scaffolding; Phase 4 planned
  - RN Feature: CSV export scaffold; OAuth scaffolding (Phase 2/4)
  - Documentation mapping:  apk-analysis-2026-03-11.md (Drive backup scaffold), drive_backup_schema.md planned

- Settings & permissions
  - APK Finding: Permissions for notifications, boot, internet, etc.
  - RN Feature: Settings screen; permission prompts; backup preferences
  - Documentation mapping: apk-analysis-2026-03-11.md (permissions), ui_navigation.md

- Theming & accessibility
  - APK Finding: Pink/dark theme vibe; color tokens present
  - RN Mapping: AppThemePinkDark, color tokens; accessibility notes in navigation doc

Gaps & Grown-Ins to Document Next
- DB schema migration details (we’ve added a schema doc; ensure migrations cover v1 -> v2 as MVP evolves)
- CSV export schema (headers/columns) for Drive backups
- Security: Drive OAuth flows, token storage, local data protection
- i18n and localization strategy
- Cross-platform parity plan (iOS) in a separate plan
- A consolidated APK crosswalk (single doc) to trace APK findings to all new docs

References (docs linked in plan)
- DB schema: /Users/goisemail/base/habbitNow/habbitNow/IsmailNow/notes/db_schema.md
- UI navigation: /Users/goisemail/base/habbitNow/habbitNow/IsmailNow/notes/ui_navigation.md
- Data model (TypeScript): /Users/goisemail/base/habbitNow/habbitNow/IsmailNow/notes/dm-spec-types.ts
- History & Analytics data model: /Users/goisemail/base/habbitNow/habbitNow/IsmailNow/notes/history_analytics_data_model.md
- APK analysis: /Users/goisemail/base/habbitNow/habbitNow/IsmailNow/notes/apk-analysis-2026-03-11.md
- Feature maps: /Users/goisemail/base/habbitNow/habbitNow/IsmailNow/notes/feature_map.md
