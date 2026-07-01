import { useState, useEffect, type Dispatch, type SetStateAction } from 'react'
import { useHabitsStore, Habit } from '../store/habits'
import { useTasksStore, taskVisibleOnDate } from '../store/tasks'
import { useAuth } from '../contexts/AuthContext'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './Dashboard.css'
import QuickAddSheet from '../components/QuickAddSheet'
import TaskWizard from '../components/TaskWizard'
import { getReadableTextColor } from '../utils/color'

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
  const habits = useHabitsStore((state) => state.habits)
  const logCompletion = useHabitsStore((state) => state.logCompletion)

  const tasks = useTasksStore((state) => state.tasks)
  const loading = useTasksStore((state) => state.loading)
  const fetchForDate = useTasksStore((state) => state.fetchForDate)
  const addTask = useTasksStore((state) => state.addTask)
  const markComplete = useTasksStore((state) => state.markComplete)
  const unmarkComplete = useTasksStore((state) => state.unmarkComplete)

  const { user } = useAuth()
  const token = user?.accessToken ?? null

  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [taskWizardOpen, setTaskWizardOpen] = useState(false)

  // Fetch tasks from Google Sheets whenever the selected date changes
  useEffect(() => {
    fetchForDate(selectedDate, token)
  }, [selectedDate, token])

  const handleQuickAddHabit = () => {
    window.location.href = '/habit/new'
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
    await addTask(taskName, selectedDate, token)
  }

  const handleToggle = (taskId: string, isCompleted: boolean) => {
    if (isCompleted) {
      unmarkComplete(taskId, token)
    } else {
      markComplete(taskId, selectedDate, token)
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
          <div className="row g-3">
            {habits.map((habit) => (
              <div key={habit.id} className="col-12">
                <HabitCard
                  habit={habit}
                  selectedDate={selectedDate}
                  onComplete={() => logCompletion(habit.id, selectedDate)}
                />
              </div>
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
              const titleColor = getReadableTextColor(task.backgroundColor)
              return (
                <div
                  key={task.id}
                  className="task-row"
                  style={{ backgroundColor: task.backgroundColor ?? '#f8f9fa' }}
                  data-testid={'task-' + task.id}
                >
                  <span
                    className={'task-title' + (isCompleted ? ' completed' : '')}
                    style={{ color: isCompleted ? '#6c757d' : titleColor }}
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
    </div>
  )
}

// ─── HabitCard ────────────────────────────────────────────────────────────────

interface HabitCardProps {
  habit: Habit
  selectedDate: string
  onComplete: () => void
}

function HabitCard({ habit, selectedDate, onComplete }: HabitCardProps) {
  const isDone = habit.lastCompletedDate === selectedDate

  return (
    <div className="habit-card card" data-testid={'habitCard-' + habit.id}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h3 className="card-title h6 mb-0">{habit.name}</h3>
          <span className="badge bg-secondary">{habit.streak} 🔥</span>
        </div>

        <div className="progress mb-2" style={{ height: '24px' }}>
          <div
            className="progress-bar"
            role="progressbar"
            style={{ width: (habit.progress * 100) + '%', backgroundColor: habit.color }}
            aria-valuenow={habit.progress * 100}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">
            {(habit.progress * 100).toFixed(0)}% complete
          </small>
          <button
            className={'habit-toggle' + (isDone ? ' done' : '')}
            onClick={onComplete}
            aria-label={habit.name + (isDone ? ' done' : ' mark as completed')}
            data-testid={'habitLog-' + habit.id}
          >
            {isDone && '✓'}
          </button>
        </div>
      </div>
    </div>
  )
}
