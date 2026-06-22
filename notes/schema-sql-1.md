-- SQL schema for offline-first RN MVP (IsmailNow)
-- Version 1 initialization
CREATE TABLE Habits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  frequency TEXT NOT NULL,
  startDate TEXT,
  endDate TEXT,
  notes TEXT,
  createdAt TEXT,
  updatedAt TEXT
);

CREATE TABLE Reminders (
  id TEXT PRIMARY KEY,
  habitId TEXT NOT NULL,
  time TEXT NOT NULL,
  repeat TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  timezone TEXT,
  createdAt TEXT,
  updatedAt TEXT,
  FOREIGN KEY (habitId) REFERENCES Habits(id)
);

CREATE TABLE HabitInstance (
  id TEXT PRIMARY KEY,
  habitId TEXT NOT NULL,
  date TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  value REAL,
  notes TEXT,
  FOREIGN KEY (habitId) REFERENCES Habits(id)
);

CREATE TABLE HistoryEntry (
  id TEXT PRIMARY KEY,
  habitId TEXT NOT NULL,
  date TEXT NOT NULL,
  value REAL,
  note TEXT,
  FOREIGN KEY (habitId) REFERENCES Habits(id)
);

CREATE TABLE UserProfile (
  id TEXT PRIMARY KEY,
  displayName TEXT,
  email TEXT,
  avatarUrl TEXT,
  createdAt TEXT
);

CREATE TABLE Settings (
  id TEXT PRIMARY KEY,
  notifyEnabled INTEGER,
  remindBeforeMinutes INTEGER,
  backupEnabled INTEGER,
  backupFrequency TEXT,
  locale TEXT,
  language TEXT
);

-- Migration tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT,
  description TEXT
);

INSERT INTO schema_migrations (version, applied_at, description)
VALUES (1, datetime('now'), 'Initial schema for offline-first RN MVP');
