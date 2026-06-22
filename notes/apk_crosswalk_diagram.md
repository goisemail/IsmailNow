# APK Crosswalk Diagram (Mermaid) - IsmailNow

Date: 2026-03-11
App: HabitNow.apk

```mermaid
graph TD
  APK[APK Findings]
  HabitEditor[Habit Editor & Cadence]
  Reminders[Reminders & Notifications]
  HistoryAnalytics[History & Analytics]
  DriveBackups[Drive CSV Backups]
  SettingsPerms[Settings & Permissions]
  Theming[Theming & Accessibility]

  APK --> HabitEditor
  APK --> Reminders
  APK --> HistoryAnalytics
  APK --> DriveBackups
  APK --> SettingsPerms
  APK --> Theming

  subgraph RN_MVP_Docs [RN MVP Documentation]
    HEd[3.1 Habit Editor & Cadence]
    RNd[3.2 Reminders & Notifications]
    HAnal[3.3 History & Analytics]
    TestM[3.4 Test Matrix] 
    UI[ui_navigation.md]
  end

  HabitEditor --> HEd
  Reminders --> RNd
  HistoryAnalytics --> HAnal
  DriveBackups --> TestM
  SettingsPerms --> UI
  Theming --> UI

  subgraph DataModels [Data/Models]
    DM1[Habit, Reminder, HabitInstance, HistoryEntry, UserProfile, Settings]
    DM2[AppDataModel: habits, reminders, history, user, settings]
    DM3[History Analytics: history_analytics_data_model.md]
  end

  HEd --> DM1
  Reminders --> DM1
  HistoryAnalytics --> DM3
  DM1 --> DM2
  DM3 --> DM2
  DM2 --> UI
```

Notes
- This light-weight diagram provides a quick crosswalk view; you can embed this in your docs viewer to visualize how APK signals map to RN MVP artifacts.
- You can extend with more detailed mappings as you add migration notes, security, and i18n docs.
