# Data Model – Additional MVP Samples (IsmailNow)

These samples extend the MVP data model JSON for testing UI, validation, and analytics.

## Sample #2
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
    },
    {
      "id": "habit-2",
      "name": "Read 20 pages",
      "color": "#4CAF50",
      "icon": "book",
      "frequency": "daily",
      "startDate": "2026-02-15",
      "endDate": null,
      "notes": "Evening reading",
      "createdAt": "2026-02-15T10:00:00Z",
      "updatedAt": "2026-03-09T09:00:00Z"
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
    },
    {
      "id": "rem-2",
      "habitId": "habit-2",
      "time": "21:00",
      "repeat": "daily",
      "enabled": true,
      "timezone": "UTC",
      "createdAt": "2026-02-16T10:00:00Z",
      "updatedAt": "2026-03-09T09:00:00Z"
    }
  ],
  "history": [
    {
      "id": "hist-1",
      "habitId": "habit-1",
      "date": "2026-03-10",
      "value": 1,
      "notes": "Completed"
    },
    {
      "id": "hist-2",
      "habitId": "habit-2",
      "date": "2026-03-09",
      "value": 1,
      "notes": "Finished reading"
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

## Sample #3
```json
{
  "habits": [
    {
      "id": "habit-3",
      "name": "Hydration",
      "color": "#00BCD4",
      "icon": "water",
      "frequency": "daily",
      "startDate": "2026-03-01",
      "endDate": null,
      "notes": "2L water per day",
      "createdAt": "2026-03-01T08:00:00Z",
      "updatedAt": "2026-03-12T00:00:00Z"
    }
  ],
  "reminders": [],
  "history": [],
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
    "backupEnabled": false,
    "backupFrequency": "manual",
    "locale": "en-US",
    "language": "en"
  }
}
```

## Sample #4
```json
{
  "habits": [
    {
      "id": "habit-4",
      "name": "Evening Journaling",
      "color": "#9C27B0",
      "icon": "journal",
      "frequency": "daily",
      "startDate": "2026-03-05",
      "endDate": "2026-12-31",
      "notes": "Reflect on day",
      "createdAt": "2026-03-05T08:00:00Z",
      "updatedAt": "2026-03-12T00:00:00Z"
    }
  ],
  "reminders": [
    {
      "id": "rem-5",
      "habitId": "habit-4",
      "time": "21:30",
      "repeat": "daily",
      "enabled": true,
      "timezone": "UTC",
      "createdAt": "2026-03-05T08:00:00Z",
      "updatedAt": "2026-03-12T00:00:00Z"
    }
  ],
  "history": [
    {
      "id": "hist-5",
      "habitId": "habit-4",
      "date": "2026-03-12",
      "value": 1,
      "notes": "Journaling done"
    }
  ],
  "user": {
    "id": "user-3",
    "displayName": "Ismail D",
    "email": "ismaild@example.com",
    "avatarUrl": null,
    "createdAt": "2026-03-01T00:00:00Z"
  },
  "settings": {
    "id": "set-3",
    "notifyEnabled": true,
    "remindBeforeMinutes": 20,
    "backupEnabled": true,
    "backupFrequency": "daily",
    "locale": "en-US",
    "language": "en"
  }
}
```
