# History & Analytics Data Model (IsmailNow)

Date: 2026-03-11
Source: IsmailNow offline-first RN MVP

Overview
- Dedicated data-model document for History & Analytics built on offline data (HistoryEntry, HabitInstance) to support metrics like completion rate and streaks.
- All analytics are computed client-side in React Native from local SQLite data.

Core data sources
- HistoryEntry: id, habitId, date (ISO), value?, note?
- HabitInstance: id, habitId, date (ISO), completed, value, notes
- Habits provide context for analytics via their startDate, endDate, and frequency fields.

Analytics data model (transient / derived)
- AnalyticsSnapshot
  - dateRange: { startDate: string, endDate: string } // ISO date strings
  - perHabitMetrics: { [habitId: string]: HabitMetrics }
- HabitMetrics
  - habitId: string
  - completionRate: number | null // 0.0 - 1.0, null if no valid days in range
  - currentStreak: number
  - maxStreak: number
  - totalCompletions: number
  - dailyBreakdown: Array<{ date: string; completed: boolean; value?: number }>

- AllHabitsMetrics (optional aggregate across all habits in range)
  - averageCompletionRate: number
  - averageCurrentStreak: number
  - maxOverallStreak: number

Derivation rules (formulas)
- totalDaysInRange(habit, range)
  - rangeDays = number of calendar days from range.startDate to range.endDate inclusive
  - activePeriod = intersection with [habit.startDate, habit.endDate or today]
  - totalDaysInRange = count of days in activePeriod ∩ range
- completionDays(habit, range)
  - Count days within range where there exists a HabitInstance for habit and completed = true or HistoryEntry with value indicating completion
- completionRate = if totalDaysInRange > 0 then completionDays / totalDaysInRange else null
- currentStreak(habit, range)
  - Start from range.endDate and move backwards; count consecutive days where a completed HabitInstance exists for that date
  - Stop when a date with no completion or missing HabitInstance is encountered
- maxStreak(habit, range)
  - Compute streaks across all sub-periods within range and take the maximum length of consecutive completed days
- dailyBreakdown
  - Array aligned to each date in range; each item shows { date, completed boolean, value optional }

Sample JSON (MVP)
```json
{
  "dateRange": { "startDate": "2026-03-01", "endDate": "2026-03-10" },
  "perHabitMetrics": {
    "habit-1": {
      "habitId": "habit-1",
      "completionRate": 0.8,
      "currentStreak": 3,
      "maxStreak": 5,
      "totalCompletions": 8,
      "dailyBreakdown": [
        { "date": "2026-03-01", "completed": true },
        { "date": "2026-03-02", "completed": true },
        { "date": "2026-03-03", "completed": false },
        { "date": "2026-03-04", "completed": true },
        { "date": "2026-03-05", "completed": true },
        { "date": "2026-03-06", "completed": true },
        { "date": "2026-03-07", "completed": false },
        { "date": "2026-03-08", "completed": true },
        { "date": "2026-03-09", "completed": true },
        { "date": "2026-03-10", "completed": true }
      ]
    }
  },
  "user": { "id": "user-1", "displayName": "Ismail", "email": "ismail@example.com" },
  "settings": { "notifyEnabled": true }
}
```

Notes
- This document defines derived analytics data structures; actual implementation computes these values on-device from HistoryEntry and HabitInstance.
- If you later introduce server-side data, this document should be revised to include API contracts for analytics if needed.
