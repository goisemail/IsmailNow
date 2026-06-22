# Data Model (IsmailNow) – Offline-first RN MVP

Core entities (aligned with TypeScript DM-spec-types.ts):
- Habit: id, name, color, icon, frequency, startDate, endDate, notes, createdAt, updatedAt
- Reminder: id, habitId, time (HH:mm), repeat, enabled, timezone, createdAt, updatedAt
- HabitInstance: id, habitId, date (ISO), completed, value, notes
- HistoryEntry: id, habitId, date (ISO), value, note
- UserProfile: id, displayName, email, avatarUrl, createdAt
- Settings: id, notifyEnabled, remindBeforeMinutes, backupEnabled, backupFrequency, locale, language

Relationships:
- Habit has many Reminders
- Habit has many HabitInstances
- Habit has many HistoryEntries
- HistoryEntry/UserProfile/Settings are global contextual data

- AppDataModel:
  - habits: Habit[]
  - reminders: Reminder[]
  - history: HistoryEntry[]
  - user?: UserProfile
  - settings?: Settings

Notes:
- All date fields stored as ISO strings; UI layer will serialize to display formats as needed
- createdAt/updatedAt are optional in MVP; plan to include if auditing is required later
- Timezone in Reminder supports precise scheduling; optional for MVP

### Sample JSON (MVP)
```json
{
  "habits": [
    {
      "id": "habit-1",
      "name": "Morning Run",
      "color": "#FF5733",
      "icon": "run",
      "frequency": "daily",
      "startDate": "2026-03-01",
      "endDate": null,
      "notes": "Run 5km after waking",
      "createdAt": "2026-03-01T08:00:00Z",
      "updatedAt": "2026-03-10T12:00:00Z"
    }
  ],
  "reminders": [
    {
      "id": "rem-1",
      "habitId": "habit-1",
      "time": "07:00",
      "repeat": "daily",
      "enabled": true,
      "timezone": "UTC",
      "createdAt": "2026-03-01T08:00:00Z",
      "updatedAt": "2026-03-10T12:00:00Z"
    }
  ],
  "history": [
    {
      "id": "hist-1",
      "habitId": "habit-1",
      "date": "2026-03-10",
      "value": 1,
      "note": "Completed"
    }
  ],
  "user": {
    "id": "user-1",
    "displayName": "Ismail",
    "email": "ismail@example.com",
    "avatarUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  "settings": {
    "id": "set-1",
    "notifyEnabled": true,
    "remindBeforeMinutes": 10,
    "backupEnabled": true,
    "backupFrequency": "daily",
    "locale": "en-US",
    "language": "en"
  }
}
```
