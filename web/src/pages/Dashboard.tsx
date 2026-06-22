import { useState, useMemo } from 'react'
import { useHabitsStore, Habit } from '../store/habits'
import { useTasksStore } from '../store/tasks'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { formatDate, getDateRange, formatDateDisplay } from '../utils/date'
import './Dashboard.css'
import QuickAddSheet from '../components/QuickAddSheet'

import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import startOfWeek from 'date-fns/startOfWeek'
import getDay from 'date-fns/getDay'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

export default function Dashboard() {
  const habits = useHabitsStore((state) => state.habits)
  const logCompletion = useHabitsStore((state) => state.logCompletion)
  const tasks = useTasksStore((state) => state.tasks)
  const addTask = useTasksStore((state) => state.addTask)
  const toggleTaskCompletion = useTasksStore((state) => state.toggleTaskCompletion)

  const today = formatDate(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const dateRange = getDateRange(20)
  const scrollIndex = dateRange.indexOf(selectedDate)

  const handleDateScroll = (direction: 'prev' | 'next') => {
    const currentIndex = dateRange.indexOf(selectedDate)
    if (direction === 'prev' && currentIndex > 0) {
      setSelectedDate(dateRange[currentIndex - 1])
    } else if (direction === 'next' && currentIndex < dateRange.length - 1) {
      setSelectedDate(dateRange[currentIndex + 1])
    }
  }

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

  const locales = { 'en-US': enUS }
  const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })
  const [plannerMode, setPlannerMode] = useState<'day' | 'week' | 'month'>('week')

  const plannerEvents = useMemo(
    () =>
      tasks.map((task, index) => {
        const start = new Date(`${task.startDate}T09:00:00`)
        start.setHours(9 + (index % 8), 0, 0, 0)
        const end = new Date(start)
        end.setHours(start.getHours() + 1)
        return { title: task.title, start, end, id: task.id }
      }),
    [tasks],
  )

  return (
    <div className="dashboard container-lg py-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="h3 mb-2">HabitNow</h1>
        <p className="text-muted mb-0">Track your daily progress</p>
      </div>

      {/* Date Carousel */}
      <div className="date-carousel mb-4">
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() => handleDateScroll('prev')}
        >
          <ChevronLeft size={20} />
        </button>

        <div className="date-display text-center flex-grow-1">
          <div className="fs-5 fw-bold">{formatDateDisplay(selectedDate)}</div>
          <div className="text-muted small">{selectedDate}</div>
        </div>

        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() => handleDateScroll('next')}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Quick Date Selector */}
      <div className="date-chips mb-4">
        {dateRange.slice(Math.max(0, scrollIndex - 3), Math.min(dateRange.length, scrollIndex + 4)).map((date) => (
          <button
            key={date}
            className={`date-chip ${selectedDate === date ? 'active' : ''}`}
            onClick={() => setSelectedDate(date)}
          >
            {formatDateDisplay(date).split(' ')[0].charAt(0)}
          </button>
        ))}
      </div>

      {/* Planner Section */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="h5 mb-0">Planner</h2>
          <div className="btn-group" role="group" aria-label="Planner view">
            <button type="button" className={`btn btn-sm ${plannerMode==='day' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPlannerMode('day')} data-testid="planner-day">Day</button>
            <button type="button" className={`btn btn-sm ${plannerMode==='week' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPlannerMode('week')} data-testid="planner-week">Week</button>
            <button type="button" className={`btn btn-sm ${plannerMode==='month' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPlannerMode('month')} data-testid="planner-month">Month</button>
          </div>
        </div>

        <div className="card p-3">
          <BigCalendar
            localizer={localizer}
            events={plannerEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 500 }}
            views={["day","week","month"]}
            defaultView={plannerMode}
            view={plannerMode}
            onView={(v: any) => setPlannerMode(v as any)}
          />
        </div>
      </div>

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
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setQuickAddOpen(true)}
            data-testid="quickAddBtn"
          >
            <Plus size={16} /> Quick Add
          </button>
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
          <div className="list-group">
            {tasksForDate.map((task) => (
              <label key={task.id} className="list-group-item d-flex gap-3" data-testid={`task-${task.id}`}>
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={task.completedDate === selectedDate}
                  onChange={() => toggleTaskCompletion(task.id, selectedDate)}
                />
                <span
                  className={`flex-grow-1 ${
                    task.completedDate === selectedDate ? 'text-decoration-line-through text-muted' : ''
                  }`}
                >
                  {task.title}
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="mt-2 small text-muted">
          {completedTasks.length} of {tasksForDate.length} completed
        </div>
      </div>

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
