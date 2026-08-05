import { useState, useEffect, type Dispatch, type SetStateAction } from 'react'
import {
  getHabitEntry,
  habitIsDueOnDate,
  todayLocal,
  useHabitsStore,
  type Habit,
  type HabitEntry,
} from '../store/habits'
import { useTasksStore, taskVisibleOnDate } from '../store/tasks'
import { useAuth } from '../contexts/AuthContext'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './Dashboard.css'
import QuickAddSheet from '../components/QuickAddSheet'
import HabitWizard from '../components/HabitWizard'
import TaskWizard from '../components/TaskWizard'
import { getContrastingAccentColor } from '../utils/color'

interface WeekDay {
  key: string
  weekday: string
  dateLabel: string
}

interface DashboardProps {
  selectedDate: string
  setSelectedDate: Dispatch<SetStateAction<string>>
}

interface WeekNavigatorProps {
  selectedDate: string
  setSelectedDate: Dispatch<SetStateAction<string>>
  weekOffset: number
  setWeekOffset: Dispatch<SetStateAction<number>>
}

function getWeekDays(weekOffset: number): WeekDay[] {
  const now = new Date()
  const todayKey = now.toISOString().slice(0, 10)
  const [yr, mo, dy] = todayKey.split('-').map(Number)
  const todayMs = Date.UTC(yr, mo - 1, dy)
  const dow = new Date(todayMs).getUTCDay()
  const sundayMs = todayMs - dow * 86400000 + weekOffset * 7 * 86400000
  return Array.from({ length: 7 }, (_, i) => {
    const ms = sundayMs + i * 86400000
    const d = new Date(ms)
    const key = d.toISOString().slice(0, 10)
    const display = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    const weekday = display.toLocaleDateString('en-US', { weekday: 'short' })
    const dateLabel = display.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return { key, weekday, dateLabel }
  })
}

export function DashboardWeekNavigator({
  selectedDate,
  setSelectedDate,
  weekOffset,
  setWeekOffset,
}: WeekNavigatorProps) {
  const weekDays = getWeekDays(weekOffset)

  return (
    <div className="week-row-wrapper">
      <div className="week-row">
        <button
          className="week-nav-btn"
          onClick={() => setWeekOffset((w) => w - 1)}
          aria-label="Previous week"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="week-days-scroll">
          {weekDays.map((d) => (
            <button
              key={d.key}
              className={'week-day-chip' + (selectedDate === d.key ? ' active' : '')}
              onClick={() => setSelectedDate(d.key)}
            >
              <div className="week-day-label">{d.weekday}</div>
              <div className="week-date-text">{d.dateLabel}</div>
            </button>
          ))}
        </div>

        <button
          className="week-nav-btn"
          onClick={() => setWeekOffset((w) => w + 1)}
          aria-label="Next week"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}

export default function Dashboard({ selectedDate }: DashboardProps) {
  const storedHabits = useHabitsStore((state) => state.habits)
  const entries = useHabitsStore((state) => state.entries)
  const habits = storedHabits.filter((habit) => habitIsDueOnDate(habit, selectedDate))
  const logCompletion = useHabitsStore((state) => state.logCompletion)
  const addHabit = useHabitsStore((state) => state.addHabit)

  const tasks = useTasksStore((state) => state.tasks)
  const loading = useTasksStore((state) => state.loading)
  const fetchForDate = useTasksStore((state) => state.fetchForDate)
  const addTask = useTasksStore((state) => state.addTask)
  const markComplete = useTasksStore((state) => state.markComplete)
  const unmarkComplete = useTasksStore((state) => state.unmarkComplete)

  const { canSync, getAccessToken } = useAuth()

  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [taskWizardOpen, setTaskWizardOpen] = useState(false)
  const [habitWizardOpen, setHabitWizardOpen] = useState(false)

  // Fetch tasks from Google Sheets whenever the selected date changes
  useEffect(() => {
    fetchForDate(selectedDate, canSync ? getAccessToken : null)
  }, [canSync, fetchForDate, getAccessToken, selectedDate])

  const handleQuickAddHabit = () => {
    setQuickAddOpen(false)
    setHabitWizardOpen(true)
  }

  const handleQuickAddTask = () => {
    setQuickAddOpen(false)
    setTaskWizardOpen(true)
  }

  const handleQuickAddPriority = () => {
    setQuickAddOpen(false)
    setTaskWizardOpen(true)
  }

  const handleSaveTask = async (taskName: string) => {
    await addTask(taskName, selectedDate)
  }

  const handleToggle = (taskId: string, isCompleted: boolean) => {
    if (isCompleted) {
      unmarkComplete(taskId)
    } else {
      markComplete(taskId, selectedDate)
    }
  }

  // Apply the date-range visibility rule
  const tasksForDate = tasks.filter((t) => taskVisibleOnDate(t, selectedDate))
  const completedTasks = tasksForDate.filter((t) => t.completedDate === selectedDate)

  return (
    <div className="dashboard container-lg py-4">
      {/* Habits Section */}
      <div className="mb-4">
        <h2 className="h5 mb-3">Habits</h2>
        {habits.length === 0 ? (
          <div className="alert alert-info">
            No habits yet. Start by creating one!
          </div>
        ) : (
          <div className="habit-list">
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                entry={getHabitEntry(entries, habit.id, selectedDate)}
                locked={selectedDate > todayLocal()}
                onComplete={() => logCompletion(habit.id, selectedDate)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Tasks Section */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 mb-0">Tasks</h2>
          {loading && <span className="spinner-border spinner-border-sm text-secondary" role="status" />}
        </div>

        {tasksForDate.length === 0 ? (
          <div className="text-muted">No tasks for this date</div>
        ) : (
          <div className="task-list">
            {tasksForDate.map((task) => {
              const isCompleted = task.completedDate === selectedDate
              return (
                <div
                  key={task.id}
                  className="task-row"
                  data-testid={'task-' + task.id}
                >
                  <span className="task-color-bar" style={{ backgroundColor: getContrastingAccentColor(task.backgroundColor) }} aria-hidden="true" />
                  <span
                    className={'task-title' + (isCompleted ? ' completed' : '')}
                  >
                    {task.title}
                    {!task.synced && (
                      <span className="task-offline-badge" title="Pending sync">●</span>
                    )}
                  </span>
                  <button
                    className={'task-toggle' + (isCompleted ? ' done' : '')}
                    onClick={() => handleToggle(task.id, isCompleted)}
                    aria-label={task.title + (isCompleted ? ' done' : ' pending')}
                  >
                    {isCompleted && '✓'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-2 small text-muted">
          {completedTasks.length} of {tasksForDate.length} completed
        </div>
      </div>

      {/* FAB */}
      <button
        className="fab"
        onClick={() => setQuickAddOpen(true)}
        aria-label="Quick add"
        data-testid="fab"
      >
        +
      </button>

      <QuickAddSheet
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSelectHabit={handleQuickAddHabit}
        onSelectTask={handleQuickAddTask}
        onSelectPriority={handleQuickAddPriority}
      />

      <TaskWizard
        open={taskWizardOpen}
        onClose={() => setTaskWizardOpen(false)}
        onSave={handleSaveTask}
      />
      <HabitWizard
        open={habitWizardOpen}
        onClose={() => setHabitWizardOpen(false)}
        onSave={(draft) => addHabit(draft)}
      />
    </div>
  )
}

// ─── HabitCard ────────────────────────────────────────────────────────────────

interface HabitCardProps {
  habit: Habit
  entry?: HabitEntry
  locked: boolean
  onComplete: () => void
}

function HabitCard({ habit, entry, locked, onComplete }: HabitCardProps) {
  const target = habit.evaluation.type === 'binary' ? 1 : habit.evaluation.target
  const count = entry?.value ?? 0
  const isComplete = entry?.state === 'completed'
  return (
    <div className="habit-home-row" data-testid={'habitCard-' + habit.id}>
      <span className="habit-color-bar" style={{ backgroundColor: habit.color }} aria-hidden="true" />
      <div className="habit-home-copy">
        <span className="habit-item-title">
          {habit.name}
          {!habit.synced && <span className="task-offline-badge" title="Pending sync">●</span>}
        </span>
        <span className="habit-home-meta">
          <strong>{count}/{target}</strong>
          <span>{entry?.state ?? 'pending'}</span>
        </span>
      </div>
      <button
        className={`task-toggle${isComplete ? ' done' : ''}`}
        onClick={onComplete}
        disabled={locked}
        aria-label={`Log ${habit.name}`}
        title={locked ? 'Future habits are locked' : (isComplete ? 'Habit complete' : 'Record progress')}
        data-testid={'habitLog-' + habit.id}
      >
        {isComplete && '✓'}
      </button>
    </div>
  )
}
