import type { Habit, HabitEntry } from '../store/habits'
import type { PendingTask } from '../store/tasks'

export function buildBackupJson(
  habits: Habit[],
  habitEntries: HabitEntry[],
  tasks: PendingTask[],
  exportDate = new Date(),
) {
  return JSON.stringify({ habits, habitEntries, tasks, exportDate: exportDate.toISOString() }, null, 2)
}
