# IsmailNow APK Analysis (Canonical, Full)

Date: 2026-03-11
App: HabitNow.apk

1) App Overview
- Package: com.habitnow
- App label: HabitNow
- Purpose: Habit tracking with reminders; offline storage and cloud backups
- Platform specifics: Android app; compileSdkVersion 35; uses AndroidX; theme AppThemePinkDark
- Observed integrations: Google Sign-In (Post-MVP), Firebase Crashlytics, Google Analytics, Play Billing (Post-MVP)

2) UX Snapshot
- Main navigation: Splash/StartingActivity -> MainActivity -> Settings/Backup flows; screens for Habit Editor, Habit Details, History, Premium (Post-MVP), etc.
- Key screens: Habit list, Habit editor, History, Settings, Backup/Restore, Premium Offers (Post-MVP), Alarm/Reminders
- Visuals: Theme uses pink/dark concept; color tokens defined in colors.xml; typography guided by strings/styles usage
- Color palette: Sample tokens from colors.xml include bg_base_dark, bg_base_light, accent_material_dark/light, and a wide range of UI colors; primary accent hints at teal in material theme references

3) Features and Flows
- Major features inferred: Create/edit habits; recurring schedules; reminders/alarms; history logging; analytics; cloud backups (Drive); premium features (Post-MVP)
- User journeys: Onboarding (Post-MVP), create habit, configure cadence, enable reminders, log completion, view history, manage backups

### 4) APK Findings
- App identity: package com.habitnow; app label HabitNow
- Platform and build hints: Android; compileSdkVersion 35; theme AppThemePinkDark
- Core capabilities observed: offline-first with SQLite; Drive CSV backup scaffold (Phase 4); Premium features (Post-MVP); analytics scaffolding (Post-MVP)
- Permissions in manifest: POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, SCHEDULE_EXACT_ALARM, USE_EXACT_ALARM, FOREGROUND_SERVICE, INTERNET, WAKE_LOCK
- UI/navigation signals: Splash/StartingActivity -> MainActivity -> Habit Details, Settings, Backup; Habit Editor, Reminders, History, Premium, Backup
- Data model signals: Core entities: Habit, Reminder, HabitInstance, HistoryEntry, UserProfile, Settings; Habit has many HistoryEntry and Reminder
- Integrations: Google Sign-In (Post-MVP), Firebase Crashlytics/Analytics, Google Analytics, Play Billing (Post-MVP)
- Design cues: Pink/dark theme; color tokens; typography hints in strings/styles
- Notable gaps to document: explicit SQLite schema, CSV header/format, Drive OAuth flow, i18n plan, per-component accessibility mapping

### 3.1 Habit Editor & Cadence (Requirements)
- Objective: Provide a fully specified Habit Editor for creating/editing habits, configuring cadence, color/icon, notes, and per-habit reminders, with offline-first persistence (SQLite).
- Scope: In-scope: Habit creation/editing UI; cadence configuration; color/icon picker; notes; per-habit reminders; local data persistence; flows for create/edit/log/history; navigation between Habit Editor and Habit Details. Out-of-scope: Backend API changes in MVP; iOS specifics beyond RN; Drive backup feature to Phase 4.
- Data model mapping (align with TypeScript DM-spec-types.ts):
  - Habit -> fields: id, name, color, icon, frequency, startDate, endDate, notes, createdAt, updatedAt
  - Reminder -> fields: id, habitId, time, repeat, enabled, timezone, createdAt, updatedAt
  - HabitInstance -> fields: id, habitId, date, completed, value, notes
  - HistoryEntry -> fields: id, habitId, date, value, note
  - UserProfile -> fields: id, displayName, email, avatarUrl, createdAt
  - Settings -> fields: id, notifyEnabled, remindBeforeMinutes, backupEnabled, backupFrequency, locale, language
- User interactions & flows:
  - Create Habit: name, color, icon, cadence (daily/weekly/monthly/custom), frequency, startDate, endDate, notes; add one or more Reminders (time, repeat, timezone); save creates Habit and related Reminders
  - Edit Habit: modify all fields; adjust Reminders; save propagates changes
  - Habit Details: preview cadence, upcoming reminders, quick actions (log completion, view history)
  - Logging Completion: mark a HabitInstance for a date; create corresponding HistoryEntry; update dashboard progress
- Validation & UX:
  - Validate non-empty habit name; valid date ranges; reminder time format HH:mm; optional timezone
- Offline-first & backups:
  - Persist locally via SQLite; Drive CSV backup scaffold planned in Phase 4; no network calls for MVP actions
- Accessibility:
  - Labels for controls; high-contrast visuals; RN accessibility props
- Acceptance criteria (initial):
  - AC1: Create habit with required fields; AC2: Add/edit reminders; AC3: Edit habit fields; AC4: Complete today and generate HabitInstance + HistoryEntry; AC5: Dashboard reflects progress; AC6: Data persists offline; AC7: Validation blocks invalid input; AC8: Accessibility considerations present
- MVP considerations:
  - Support multiple reminders per habit (as per DM-spec-types.ts); if needed, limit later
- References:
  - Data model crosswalk aligns to /IsmailNow/notes/dm-spec-types.ts
- Next steps: Update artifacts in the repo accordingly after review

### 3.3 History & Analytics (Android MVP)
- Objective: Provide per-habit history visualization and basic analytics using offline-first persistence.
- Scope: In-scope: History screen, analytics dashboards, date-range filtering, per-habit history, progress metrics; offline data usage (SQLite). Out-of-scope: Advanced analytics, cross-device syncing, external data sources, non-core visualizations for MVP.
- Data model mappings (align with TypeScript model in dm-spec-types.ts):
  - HistoryEntry: id, habitId, date (ISO), value?, note?
  - HabitInstance: id, habitId, date, completed, value, notes
  - Core idea: use HistoryEntry and HabitInstance as data sources for analytics; Habits provide context.
- Analytics features and UI concepts:
  - History view: Show per-habit history entries by date with date, completed status, and optional value/note
  - Metrics (derived in RN layer):
    - Completion rate: completed days / total days in selected date range for a habit
    - Streaks: currentStreak and maxStreak for a habit within the range
    - Totals: total completions in range
  - Visualizations (simplified for MVP):
    - Line chart or sparkline for completion trend over time
    - Bar or dot chart for daily completions
  - Filters: Date range (Last 7/14/30 days, custom), Scope (single habit or all habits)
- Navigation: Access History & Analytics from Habit Details; back to Habit Details; link to overall Dashboard if applicable
- Data integrity & offline-first: All data from HistoryEntry and HabitInstance in SQLite; no network calls for MVP analytics; data rehydrates on restart
- Accessibility: Descriptive labels for charts; accessible names for controls; screen-reader friendly
- Acceptance Criteria (initial):
  - AC1: View history entries for a selected habit and all habits in a date range
  - AC2: Analytics show completion rate, current/max streak, and a trend visualization
  - AC3: Data persists offline; analytics recompute after restart
  - AC4: Date-range filter updates visuals and metrics
  - AC5: UI components accessible with labels and appropriate hit targets
- Risks/assumptions: Chart rendering may require a lightweight RN library; streak logic must handle date gaps offline
- Next steps: Patch artifacts and proceed as needed

### 3.4 Test Matrix (Android MVP)
- Objective: Formalize test cases with IDs, prerequisites, steps, and expected outcomes for Habit Editor, Reminders, and History/Analytics.
- Test IDs & topics:
  - HED-001 Habit Editor - Create Habit
  - HED-002 Habit Editor - Validation (empty name)
  - HED-003 Habit Editor - Cadence validation (endDate before startDate)
  - REM-001 Reminder - Create for Habit
  - REM-002 Reminder - Enable/Disable
  - REM-003 Reminder - Boot/Reboot re-schedule
  - HIA-001 History - Add Completion
  - HIA-002 History Analytics - Range
  - HIA-003 History Analytics - Streaks
- Prerequisites (common):
  - Android device/emulator with API level supporting POST_NOTIFICATIONS; app installed; sample data environment reset
- Matrix entries (one per test):
  - Test ID: HED-001
    - Title: Habit Editor - Create Habit
    - Prerequisites: Fresh app/start, no conflicting data
    - Steps:
      1. Open Habit Editor
      2. Enter valid name, color, icon
      3. Set cadence and dates
      4. Save
    - Expected: habit appears in list and Habit Details; data persisted
    - Status: Not Started
    - Priority: P1
  - Test ID: HED-002
    - Title: Habit Editor - Validation (empty name)
    - Steps: Leave name empty; attempt Save
    - Expected: show validation error; no habit saved
    - Status: Not Started
    - Priority: P1
  - Test ID: HED-003
    - Title: Habit Editor - Cadence validation
    - Steps: Set endDate before startDate; Save
    - Expected: validation error; no save
    - Status: Not Started
    - Priority: P2
  - Test ID: REM-001
    - Title: Reminder - Create for Habit
    - Steps: Add reminder time 07:00 daily to an existing habit
    - Expected: reminder saved and shown; notification scheduled (simulate)
    - Status: Not Started
    - Priority: P1
  - Test ID: REM-002
    - Title: Reminder - Enable/Disable
    - Steps: Disable, verify not firing; re-enable
    - Expected: scheduling toggles correctly
    - Status: Not Started
    - Priority: P2
  - Test ID: REM-003
    - Title: Reminder - Boot re-schedule
    - Steps: Simulate device reboot; verify reminders re-scheduled
    - Expected: re-scheduling occurs
    - Status: Not Started
    - Priority: P2
  - Test ID: HIA-001
    - Title: History - Add Completion
    - Steps: Mark today as completed for habit
    - Expected: HabitInstance/history entry created; visible in history
    - Status: Not Started
    - Priority: P1
  - Test ID: HIA-002
    - Title: History Analytics - Range
    - Steps: Open History/Analytics; pick date range with data
    - Expected: metrics computed and shown; range filters affect results
    - Status: Not Started
    - Priority: P2
  - Test ID: HIA-003
    - Title: History Analytics - Streaks
    - Steps: Validate current/max streak values against data
    - Expected: streak metrics correct
    - Status: Not Started
    - Priority: P2
 - 3.4 Test Matrix Summary
  - Coverage: Habit Editor, Reminders, History/Analytics
- Environment: Android emulator/device
- Table form (CSV-friendly): See test_matrix_table.md for a compact, table-based representation suitable for import into test tools.
- 3.5 iOS Considerations
- This plan focuses on Android MVP; iOS cross-platform readiness is acknowledged and will be addressed in a dedicated iOS plan later (scaffolding, signing, provisioning, deployment workflow for connected iPhone).

### 3.2 Reminders & Notifications (Android MVP)
- Objective: Define per-habit reminders with local notifications, including creation, editing, enabling/disabling, and scheduling logic, all with offline-first persistence.
- Scope: In-scope: Reminder UI (time, repetition, timezone, enabled), per-habit association, local persistence via SQLite, scheduling and triggering of local notifications, basic user flows (create, edit, delete, toggle on/off). Out-of-scope: Cloud backup sync of reminders, cross-device notification syncing, iOS-specific nuances beyond RN, advanced notification actions.
- Data model mappings (align with TypeScript model in dm-spec-types.ts):
  - Reminder fields: id, habitId, time (HH:mm), repeat, enabled, timezone, createdAt, updatedAt
- Scheduling context:
  - Reminder belongs to a Habit (habitId)
  - Repeat pattern: daily, weekly, monthly, custom
- User interactions & flows:
  - Create Reminder: time (HH:mm), repeat, timezone (optional), enabled; linked to habitId
  - Edit Reminder: update time, repeat, timezone, enabled
  - Delete Reminder: remove a specific reminder for a habit
  - Enable/Disable Reminder: toggle updates scheduling state without deletion
- Notification behavior (Android MVP):
  - Content: Habit name, reminder time, message like “Time to log progress for Habit X”
  - Trigger: show at scheduled time; quick actions: Mark complete for today, Snooze (optional with default duration)
  - Background: Notifications fire in background; re-schedule on boot/app restart; RN notification library handling
- Permissions & platform specifics:
  - Android: POST_NOTIFICATIONS permission (Android 13+), manifest entries; consider RECEIVE_BOOT_COMPLETED for re-scheduling
- UI considerations:
  - Reminder Editor: Time picker, repeat selector, timezone, enable switch; list shows upcoming reminders per habit
- Data integrity & validation:
  - Validate HH:mm format; timezone validity; reminder belongs to a habit
- Offline-first & backups:
  - Reminders persisted via SQLite; MVP no cloud sync yet; Drive backup scaffold in Phase 4
- Accessibility:
  - Labels for controls; high-contrast visuals; RN accessibility props
- Acceptance criteria (initial):
  - AC1: Create, edit, delete, and enable/disable reminders per habit
  - AC2: Local notifications trigger at scheduled times with proper content
  - AC3: Reminders persist offline across app restarts
  - AC4: Enabled reminders re-scheduled after device reboot
  - AC5: Timezone handling respected
  - AC6: Notification permissions are requested and handled
  - AC7: Reminder UI accessible and usable
- Risks / assumptions:
  - Android notification behavior varies; test across devices
-- Next steps: Patch artifacts and proceed to History & Analytics in next patch

### 3.2.1 Snooze Behavior (Android MVP)
- Objective: Define and document default and optional snooze behavior for per-habit reminders.
- Default duration: 5 minutes (configurable in future iterations).
- Snooze limits: up to 3 snoozes per reminder occurrence.
- Scheduling: After a snooze, the next firing time is current reminder time plus the snooze duration, respecting the original repeat pattern (daily/weekly/etc.).
- Persistence: Snooze state stored in SQLite and rehydrated on app restart.
- UI considerations: Snooze action triggers a quick-set option (e.g., 5/10/15 minutes) with accessibility labels.
- Acceptance criteria:
  - Snooze preempts next trigger by the specified duration and respects repeat rules.
  - Snooze states survive app restarts and device reboots.
  - Snooze only applies when the reminder is enabled.
- Notes: Align with the DM-spec-types.ts definitions for Reminder and any future per-reminder duration configurations.

4) Data Model Overview
- Core entities inferred: Habit, HabitInstance, Reminder, HistoryEntry, UserProfile, Settings
- Fields (inferred):
  - Habit: id, name, color, icon, frequency, startDate, endDate, notes
  - HabitInstance: id, habitId, date, completed
  - Reminder: id, habitId, time, repeat
  - HistoryEntry: id, habitId, date, value
  - UserProfile: id, displayName, email
  - Settings: id, notifyEnabled, backupEnabled, backupFrequency
 - Relationships: Habit -> many HistoryEntry/Reminder

#### 4.1 Data Model Alignment with TypeScript DM-spec-types.ts
- Source: /Users/goisemail/base/habbitNow/habbitNow/IsmailNow/notes/dm-spec-types.ts
- Core entities mapped to RN offline-first plan:
  - Habit: id, name, color, icon, frequency (Frequency), startDate, endDate, notes, createdAt, updatedAt
  - Reminder: id, habitId, time, repeat, enabled, timezone, createdAt, updatedAt
  - HabitInstance: id, habitId, date, completed, value, notes
  - HistoryEntry: id, habitId, date, value, note
  - UserProfile: id, displayName, email, avatarUrl, createdAt
  - Settings: id, notifyEnabled, remindBeforeMinutes, backupEnabled, backupFrequency, locale, language
- AppDataModel maps to: habits[], reminders[], history[], user?, settings?
- Notes on MVP alignment:
  - Dates stored as ISO strings; plan to serialize to YYYY-MM-DD where appropriate
  - createdAt/updatedAt exist in TS; include in DB schema for auditing if needed later
  - Timezone field in Reminder provides a path for precise alerting; can be optional in MVP
- Next steps: reflect this crosswalk in the Habit Editor requirements section and add acceptance criteria

### 4.2 APK-Derived UI Signals (IsmailNow)
- Objective: Document observed APK UI screens and map them to the RN MVP UI components.
- Observed APK screens:
  - Splash/StartingActivity
  - Habit Editor
  - Habit Details
  - History
  - Reminders
  - Settings
  - Backup/Restore
  - Premium/Offers
- RN mappings (proposed equivalents):
  - Habit Editor -> HabitEditorScreen
  - Habit Details -> HabitDetailsScreen
  - History -> HistoryAnalyticsScreen
  - Reminders -> RemindersScreen
  - Settings -> SettingsScreen
  - Backup -> BackupScreen
  - Premium/Offers -> ActivityPremium or ActivityOffer
  - Splash/StartingActivity -> StartingActivity
- Test IDs to consider for Detox/Appium (early drafting):
  - habitEditorNameInput, habitEditorSaveBtn
  - habitDetailsBackBtn, historyAnalyticsBtn, remindersBtn
  - reminderTimeInput, reminderSaveBtn
- Visual themes observed:
  - Pink/dark theme, AppThemePinkDark, color tokens in colors.xml
- Accessibility considerations:
  - Ensure test IDs; provide accessible labels on controls
- Notes:
  - This is a baseline mapping; will be refined as RN screens are defined

5) API/Backend Considerations
- Cloud backups: Google Drive CSV backups observed; backend endpoints not clearly exposed in APK; offline-first primary and no backend API sync in MVP
- Auth/backends: Google Sign-In present (Post-MVP); Firebase Crashlytics/Analytics observed; Play Billing observed for Premium (Post-MVP)

6) Offline/Sync Assumptions
- Local DB:  SQLite
- Sync: CSV backups to Drive via Phase 2 scaffolding in MVP; backend API sync is Post-MVP

7) Notifications and Reminders
- POST_NOTIFICATIONS permission present; AlarmActivity indicates local reminder scheduling
- Reminder UI flows likely include creating/editing reminders

8) Third-Party Integrations
- Firebase Crashlytics, Google Analytics, Google Sign-In (Post-MVP), Play Billing (Post-MVP)

9) Permissions and Security
- Observed permissions include INTERNET, NETWORK_STATE, WAKE_LOCK, POST_NOTIFICATIONS, FOREGROUND_SERVICE
- Security: for Drive backups, tokens must be handled securely; plan secure storage in RN later

10) UX specifics
- Visual tokens defined in colors.xml; AppThemePinkDark as primary theme; multi-theme design hints for dark/light modes
- Typography: Strings define UI text; fonts not explicit in resources; default Android fonts assumed

11) Accessibility
- Recommend adding content descriptions and accessible labels for RN components; plan for focus and keyboard navigation support where applicable

12) Risks & Gaps
- APK interpretations may miss some flows; ensure parity during RN rebuild
- Backend integration unknown; align on API contracts when introducing networked features

13) Next Steps
- Map APK findings to React Native feature plan; draft an initial offline-first data layer
- Prepare artifact templates for feature_map.md, ui_snapshot.md, and data_model.md
- Initialize a starter React Native scaffold when ready

14) Artifacts to Capture
- Feature map, UI snapshots, data models, screen flows; store in repo as markdown/text artifacts

Notes
- This document is a living artifact to guide the RN rebuild and backend alignment.
- MVP source of truth: plan-2026-03-11.md
