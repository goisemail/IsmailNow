import { useState, useMemo } from 'react'
import { useHabitsStore } from '../store/habits'
import { useTasksStore } from '../store/tasks'
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import startOfWeek from 'date-fns/startOfWeek'
import getDay from 'date-fns/getDay'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

export default function History() {
  const habits = useHabitsStore((state) => state.habits)
  const tasks = useTasksStore((state) => state.tasks)
  const [calendarMode, setCalendarMode] = useState<'day' | 'week' | 'month'>('month')

  const calendarEvents = useMemo(
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
    <div className="container py-4">
      <h1 className="h3 mb-4">History & Analytics</h1>

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card p-4 text-center">
            <div className="text-muted small mb-2">Total Habits</div>
            <div className="h2">{habits.length}</div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card p-4 text-center">
            <div className="text-muted small mb-2">Total Tasks</div>
            <div className="h2">{tasks.length}</div>
          </div>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <h3 className="h5 mb-3">Top Streaks</h3>
        {habits
          .sort((a, b) => b.streak - a.streak)
          .slice(0, 5)
          .map((habit) => (
            <div key={habit.id} className="d-flex justify-content-between mb-3 pb-3 border-bottom">
              <span>{habit.name}</span>
              <span className="badge bg-primary">{habit.streak} 🔥</span>
            </div>
          ))}
      </div>

      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="h5 mb-0">Calendar</h2>
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

        <div className="card p-3">
          <BigCalendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 500 }}
            views={['day', 'week', 'month']}
            defaultView={calendarMode}
            view={calendarMode}
            onView={(v: any) => setCalendarMode(v as any)}
          />
        </div>
      </div>

      <p className="text-muted mt-4 text-center">
        📊 Detailed analytics coming soon...
      </p>
    </div>
  )
}
