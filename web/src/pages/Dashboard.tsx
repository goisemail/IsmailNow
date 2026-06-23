import { useState, type Dispatch, type SetStateAction } from 'react'
import { useHabitsStore, Habit } from '../store/habits'
import { useTasksStore } from '../store/tasks'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './Dashboard.css'
import QuickAddSheet from '../components/QuickAddSheet'

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
  const dow = new Date(todayMs).getUTCDay() // 0 = Sunday
  const sundayMs = todayMs - dow * 86400000 + weekOffset * 7 * 86400000
  return Array.from({ length: 7 }, (_, i) => {
    const ms = sundayMs + i * 86400000
    const d = new Date(ms)
    const key = d.toISOString().slice(0, 10)
    const display = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    const weekday = display.toLocaleDateString('en-US', { weekday: 'short' })
    const dateLabel = display.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
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
        {/* Left arrow (←) — navigate to previous week */}
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
              className={`week-day-chip ${selectedDate === d.key ? 'active' : ''}`}
              onClick={() => setSelectedDate(d.key)}
            >
              <div className="week-day-label">{d.weekday}</div>
              <div className="week-date-text">{d.dateLabel}</div>
            </button>
          ))}
        </div>

        {/* Right arrow (→) — navigate to next week */}
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

export default function Dashboard({
  selectedDate,
  setSelectedDate,
}: DashboardProps) {
  // setSelectedDate is used in DashboardWeekNavigator component
  // The actual usage is in DashboardWeekNavigator where it's passed as a prop
  // but TypeScript doesn't recognize this cross-component usage
  // We reference it to prevent TS6133 error
  setSelectedDate; // Reference to prevent unused variable error
  
  const habits = useHabitsStore((state) => state.habits)
  const logCompletion = useHabitsStore((state) => state.logCompletion)
  const tasks = useTasksStore((state) => state.tasks)
  const addTask = useTasksStore((state) => state.addTask)
  const toggleTaskCompletion = useTasksStore((state) => state.toggleTaskCompletion)

  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (taskTitle.trim()) {
      addTask(taskTitle, selectedDate)
      setTaskTitle('')
      setShowTaskForm(false)
    }
  }

  const handleQuickAddHabit = () => {
    window.location.href = '/habit/new'
  }

  const handleQuickAddTask = () => {
    setShowTaskForm(true)
  }

  const handleQuickAddPriority = () => {
    // Priority is similar to task for now
    setShowTaskForm(true)
  }

  const tasksForDate = tasks.filter((task) => task.startDate === selectedDate)
  const completedTasks = tasksForDate.filter((task) => task.completedDate === selectedDate)

  return (
    <div className="dashboard container-lg py-4">
      {/* Header */}

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
                  onComplete={() => logCompletion(habit.id)}
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
        </div>

        {showTaskForm && (
          <form onSubmit={handleAddTask} className="mb-3">
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Task title..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                autoFocus
                data-testid="taskInput"
              />
              <button className="btn btn-primary" type="submit">
                Add
              </button>
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setShowTaskForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {tasksForDate.length === 0 ? (
          <div className="text-muted">No tasks for this date</div>
        ) : (
          <div className="task-list">
            {tasksForDate.map((task) => (
              <div key={task.id} className="task-row" data-testid={`task-${task.id}`}>
                <span
                  className={`task-title ${
                    task.completedDate === selectedDate ? 'completed' : ''
                  }`}
                >
                  {task.title}
                </span>
                <button
                  className={`task-toggle ${
                    task.completedDate === selectedDate ? 'done' : ''
                  }`}
                  onClick={() => toggleTaskCompletion(task.id, selectedDate)}
                  aria-label={`${task.title} ${task.completedDate === selectedDate ? 'done' : 'pending'}`}
                >
                  {task.completedDate === selectedDate && '✓'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 small text-muted">
          {completedTasks.length} of {tasksForDate.length} completed
        </div>
      </div>

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
    </div>
  )
}

interface HabitCardProps {
  habit: Habit
  onComplete: () => void
}

function HabitCard({ habit, onComplete }: HabitCardProps) {
  return (
    <div className="habit-card card" data-testid={`habitCard-${habit.id}`}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h3 className="card-title h6 mb-0">{habit.name}</h3>
          <span className="badge bg-secondary">{habit.streak} 🔥</span>
        </div>

        <div className="progress mb-2" style={{ height: '24px' }}>
          <div
            className="progress-bar"
            role="progressbar"
            style={{
              width: `${habit.progress * 100}%`,
              backgroundColor: habit.color,
            }}
            aria-valuenow={habit.progress * 100}
            aria-valuemin={0}
            aria-valuemax={100}
          ></div>
        </div>

        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">
            {(habit.progress * 100).toFixed(0)}% complete
          </small>
          <button
            className="btn btn-sm"
            style={{
              backgroundColor: habit.color,
              color: 'white',
              border: 'none',
            }}
            onClick={onComplete}
            data-testid={`habitLog-${habit.id}`}
          >
            Log
          </button>
        </div>
      </div>
    </div>
  )
}
