# UI Navigation & Theme Guide (IsmailNow)

Overview
- Defines the primary navigation graph for the React Native MVP and how screens map to routes.
- Emphasizes color/theme usage, testIDs for automation, and accessibility concerns.

Navigation Graph (proposed React Navigation setup)
- RootNavigator
  - MainStack (Bottom Tabs or Stack): HabitsStack, SettingsStack
- HabitsStack
  - HabitsDashboardScreen (route: Habits)
  - HabitEditorScreen (route: HabitEditor, params: { habitId?: string })
  - HabitDetailsScreen (route: HabitDetails, params: { habitId: string })
  - HistoryAnalyticsScreen (route: HistoryAnalytics, params: { habitId?: string })
  - RemindersScreen (route: Reminders, params: { habitId: string })
- SettingsStack
  - SettingsScreen (route: Settings)
  - BackupScreen (route: Backup)
  - ThemeEditorScreen (route: Themes)

Key Screens and expected data props
- HabitsDashboardScreen: shows list of Habit cards; each card has onPress to HabitDetails and onLongPress to HabitEditor
- HabitEditorScreen: fields for name, color, icon, cadence, dates, notes; add Reminders; Save
- HabitDetailsScreen: show cadence summary, upcoming reminders, quick actions (Log Completion, View History)
- HistoryAnalyticsScreen: date-range picker with metrics; view per-habit analytics when habitId provided
- RemindersScreen: per-habit reminders management (add/edit/delete; enable/disable)

Theming & colors
- Primary theme: AppThemePinkDark
- Token usage: bg_base_dark, bg_base_light, accent_material_dark/light, and defined color tokens (see colors-hex-full-*.md)
- Ensure consistent typography by using strings.xml and font families defined in styles.xml

Test IDs (for UI automation)
- Habit dashboard: habitCard-<id>
- Habit editor fields: habitEditorNameInput, habitEditorCadenceDaily, habitEditorSaveBtn
- Habit details: habitDetailsBackBtn, historyAnalyticsBtn, remindersBtn
- Reminders: addReminderBtn, reminderTimeInput, reminderSaveBtn
- History/Analytics: dateRangeLast7, analyticsChart

Accessibility & i18n
- All interactive elements must expose accessible labels and roles
- Locale support hooks into i18n system; default to en-US

## Expanded Navigation Details

### 1. Expanded Navigation Graph (React Navigation)
- RootNavigator
  - MainStack (Bottom Tabs): HabitsTab, SettingsTab
- HabitsStack
  - HabitsDashboardScreen (route: 'Habits')
  - HabitEditorScreen (route: 'HabitEditor', params: { habitId?: string })
  - HabitDetailsScreen (route: 'HabitDetails', params: { habitId: string })
  - RemindersScreen (route: 'Reminders', params: { habitId: string })
  - HistoryAnalyticsScreen (route: 'HistoryAnalytics', params: { habitId?: string })
- SettingsStack
  - SettingsScreen (route: 'Settings')
  - BackupScreen (route: 'Backup')
  - ThemeEditorScreen (route: 'Themes')

### 2. Routes & Parameters (examples)
- HabitEditor: habitId?: string
- HabitDetails: habitId: string
- Reminders: habitId: string
- HistoryAnalytics: habitId?: string

### 3. UI Components & Test IDs (mapping to automation)
- HabitsDashboardScreen: habitCard-<id>, habitCard-title-<id>
- HabitEditorScreen: habitEditorNameInput, habitEditorCadenceDaily, habitEditorSaveBtn, habitEditorColorPicker, habitEditorIconPicker
- HabitDetailsScreen: habitDetailsBackBtn, habitDetailsRemindersBtn, habitDetailsHistoryBtn
- RemindersScreen: addReminderBtn, reminderTimeInput, reminderRepeatPicker, reminderSaveBtn
- HistoryAnalyticsScreen: dateRangeLast7, dateRangeLast30, analyticsChart

### 4. Theming & Accessibility Enhancements
- Theme: AppThemePinkDark; ensure tokens bg_base_dark, bg_base_light, accent_material_dark/light are used consistently
- Typography: rely on strings.xml and styles.xml
- Accessibility: ensure all test IDs are accessible, provide descriptive labels, and ensure high contrast targets

### 5. Deep Linking (Concept)
- Plan to add deep links for HabitEditor and HistoryAnalytics in a future patch (e.g., myapp://habitEditor?habitId=abc)

### 6. Next Steps
- Align UI navigation with RN components and ensure Detox/Appium test IDs map to these routes
- If you want, I can also add a small Mermaid diagram in a separate doc for a visual of the navigation graph
