Draft per-screen accessibility mapping (APK-derived signals)
Note: The following IDs are placeholders to be replaced with verified RN source IDs. Update once sources are available.

- HabitEditorScreen
  - accessibilityLabel: "Habit Editor"
  - testIDs: habitEditorNameInput, habitEditorSaveBtn
  - accessibilityRole: name input = textbox; Save = button
  - focusOrder: habitEditorNameInput -> color/icon pickers -> cadence -> startDate -> endDate -> notes -> reminders -> habitEditorSaveBtn
  - notes: other controls (color/icon, cadence, dates, notes, per-habit reminders) to be finalized after full APK review

- HabitDetailsScreen
  - accessibilityLabel: "Habit Details"
  - testIDs: habitDetailsBackBtn, historyAnalyticsBtn, remindersBtn
  - accessibilityRole: Back = button; History = button; Reminders = button
  - focusOrder: habitDetailsBackBtn -> historyAnalyticsBtn -> remindersBtn -> quick actions (log completion, edit)
  - notes: confirm IDs for quick actions (log, edit)

- HistoryAnalyticsScreen
  - accessibilityLabel: "History & Analytics"
  - testIDs: HIA-001, HIA-002, HIA-003
  - accessibilityRole: section header; chart elements; date-range controls
  - focusOrder: dateRangePicker -> historyList -> charts/metrics
  - notes: map to APK test IDs: HIA-001 (Add Completion), HIA-002 (Range), HIA-003 (Streaks); confirm dateRangePicker ID if present

- RemindersScreen
  - accessibilityLabel: "Reminders"
  - testIDs: reminderTimeInput, reminderSaveBtn, addReminderBtn
  - accessibilityRole: list item (reminder) with time input; toggle for enabled
  - focusOrder: reminderList -> reminderTimeInput -> reminderSaveBtn -> addReminderBtn
  - notes: IDs for per-reminder edit/delete actions to confirm

- SettingsScreen
  - accessibilityLabel: "Settings"
  - testIDs: settingsNotifyToggle, settingsBackupToggle, settingsLocalePicker, settingsLanguagePicker  (Placeholder)
  - accessibilityRole: sectioned controls (toggle, pickers, etc.)
  - focusOrder: top-level sections -> individual controls
  - notes: confirm IDs after APK review; accessibilityLabels for each control as applicable

- BackupScreen
  - accessibilityLabel: "Backup & Restore"
  - testIDs: backupButton, restoreButton, backupTriggerBtn, restoreTriggerBtn  (Placeholder)
  - accessibilityRole: buttons for Backup and Restore
  - focusOrder: backupButton -> restoreButton
  - notes: confirm exact IDs later

- ActivityPremium/Offers
  - accessibilityLabel: "Premium"
  - testIDs: premiumBuyBtn, premiumRestoreBtn  (Placeholder)
  - accessibilityRole: button(s) for purchase/upgrade
  - focusOrder: main premium actions
  - notes: confirm IDs during APK review; consider in-app purchase flows

- StartingActivity
  - accessibilityLabel: "HabitNow"
  - testIDs: startingContinueBtn
  - accessibilityRole: decorative logo; proceed/main button (if present)
  - focusOrder: logo (aria-hidden if decorative) -> proceed/main button (if exists)
  - notes: confirm if a proceed button exists on first launch

Question:
Shall I save this draft as a new file at /Users/goisemail/base/habbitNow/habbitNow/IsmailNow/notes/accessibility-mapping.md and update the notes accordingly?
