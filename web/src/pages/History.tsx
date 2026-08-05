import { useState, useMemo } from 'react'
import { getHabitStats, useHabitsStore } from '../store/habits'
import { useTasksStore } from '../store/tasks'
import { Calendar as BigCalendar, dateFnsLocalizer, type View } from 'react-big-calendar'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import startOfWeek from 'date-fns/startOfWeek'
import getDay from 'date-fns/getDay'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './History.css'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

export default function History() {
  const storedHabits = useHabitsStore((state) => state.habits)
  const habits = storedHabits.filter((habit) => !habit.isDeleted)
  const entries = useHabitsStore((state) => state.entries)
  const tasks = useTasksStore((state) => state.tasks)
  const [calendarMode, setCalendarMode] = useState<'day' | 'week' | 'month'>('month')

  const calendarEvents = useMemo(
    () => {
      const taskEvents = tasks
        .filter((task) => !task.isDeleted)
        .map((task, index) => {
        const start = new Date(`${task.startDate}T09:00:00`)
        start.setHours(9 + (index % 8), 0, 0, 0)
        const end = new Date(start)
        end.setHours(start.getHours() + 1)
        return { title: task.title, start, end, id: `task:${task.id}` }
      })
      const habitsById = new Map(habits.map((habit) => [habit.id, habit]))
      const habitEvents = entries
        .filter((entry) => entry.state === 'completed' && !entry.isDeleted && habitsById.has(entry.habitId))
        .map((entry) => {
          const start = new Date(`${entry.date}T18:00:00`)
          const end = new Date(start)
          end.setMinutes(end.getMinutes() + 30)
          return { title: `✓ ${habitsById.get(entry.habitId)?.name}`, start, end, id: `habit:${entry.id}` }
        })
      return [...taskEvents, ...habitEvents]
    },
    [entries, habits, tasks],
  )
  const topHabit = habits
    .map((habit) => ({ habit, streak: getHabitStats(habit, entries).bestStreak }))
    .sort((a, b) => b.streak - a.streak)[0]

  return (
    <div className="history-page">
      {/* Header: title + view toggle */}
      <div className="history-header">
        <h1 className="h3 mb-0">History</h1>
        <div className="btn-group" role="group" aria-label="Calendar view">
          <button
            type="button"
            className={`btn btn-sm ${calendarMode === 'day' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setCalendarMode('day')}
          >
            Day
          </button>
          <button
            type="button"
            className={`btn btn-sm ${calendarMode === 'week' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setCalendarMode('week')}
          >
            Week
          </button>
          <button
            type="button"
            className={`btn btn-sm ${calendarMode === 'month' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setCalendarMode('month')}
          >
            Month
          </button>
        </div>
      </div>

      {/* Calendar fills remaining space */}
      <div className="history-calendar-wrap">
        <div className="card">
          <BigCalendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            views={['day', 'week', 'month']}
            defaultView={calendarMode}
            view={calendarMode}
            onView={(view: View) => {
              if (view === 'day' || view === 'week' || view === 'month') setCalendarMode(view)
            }}
          />
        </div>
      </div>

      {/* Stats row at bottom */}
      <div className="history-stats">
        <div className="card">
          <div className="text-muted">Total Habits</div>
          <div className="h2">{habits.length}</div>
        </div>
        <div className="card">
          <div className="text-muted">Total Tasks</div>
          <div className="h2">{tasks.filter((t) => !t.isDeleted).length}</div>
        </div>
        <div className="card" style={{ flex: 2 }}>
          <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 4 }}>Top Streak</div>
          {topHabit ? (
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: '0.9rem' }}>{topHabit.habit.name}</span>
              <span className="badge bg-primary">{topHabit.streak} 🔥</span>
            </div>
          ) : (
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>No habits yet</span>
          )}
        </div>
      </div>
    </div>
  )
}
