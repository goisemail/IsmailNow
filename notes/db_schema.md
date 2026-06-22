# DB Schema for HabitNow (IsmailNow) – MVP Offline SQLite

Date: 2026-03-11
Scope: Offline-first mobile database schema to support Habit, Reminders, History, and related entities.

Tables
- Habit
  - id TEXT PRIMARY KEY
  - name TEXT NOT NULL
  - color TEXT
  - icon TEXT
  - frequency TEXT NOT NULL -- ('daily','weekly','monthly','custom')
  - startDate TEXT -- ISO date yyyy-mm-dd
  - endDate TEXT -- ISO date or NULL
  - notes TEXT
  - createdAt TEXT
  - updatedAt TEXT

- Reminder
  - id TEXT PRIMARY KEY
  - habitId TEXT NOT NULL
  - time TEXT NOT NULL -- HH:mm (24h)
  - repeat TEXT -- ('daily','weekly','monthly','custom')
  - enabled INTEGER -- 0/1
  - timezone TEXT
  - createdAt TEXT
  - updatedAt TEXT
  - FOREIGN KEY(habitId) REFERENCES Habit(id)

- HabitInstance
  - id TEXT PRIMARY KEY
  - habitId TEXT NOT NULL
  - date TEXT NOT NULL -- ISO date (YYYY-MM-DD)
  - completed INTEGER -- 0/1
  - value INTEGER
  - notes TEXT
  - FOREIGN KEY(habitId) REFERENCES Habit(id)

- HistoryEntry
  - id TEXT PRIMARY KEY
  - habitId TEXT NOT NULL
  - date TEXT NOT NULL -- ISO date
  - value INTEGER
  - note TEXT
  - FOREIGN KEY(habitId) REFERENCES Habit(id)

- UserProfile
  - id TEXT PRIMARY KEY
  - displayName TEXT
  - email TEXT
  - avatarUrl TEXT
  - createdAt TEXT

- Settings
  - id TEXT PRIMARY KEY
  - notifyEnabled INTEGER
  - remindBeforeMinutes INTEGER
  - backupEnabled INTEGER
  - backupFrequency TEXT -- ('daily','weekly','manual')
  - locale TEXT
  - language TEXT

Indexes
- idx_habit_name ON Habit(name)
- idx_habitDate ON HabitInstance(habitId, date)
- idx_history_date ON HistoryEntry(habitId, date)

Migration plan (MVP -> next iterations)
- v1: Create all tables as defined above
- v2: Add indices, and add a migration path for adding new columns if needed
