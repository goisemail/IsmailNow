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
import './History.css'

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
            onView={(v: any) => setCalendarMode(v as any)}
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
          <div className="h2">{tasks.length}</div>
        </div>
        <div className="card" style={{ flex: 2 }}>
          <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 4 }}>Top Streak</div>
          {habits.length > 0 ? (
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: '0.9rem' }}>{habits.sort((a, b) => b.streak - a.streak)[0].name}</span>
              <span className="badge bg-primary">{habits[0].streak} 🔥</span>
            </div>
          ) : (
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>No habits yet</span>
          )}
        </div>
      </div>
    </div>
  )
}
