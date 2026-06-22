import { useState, useMemo } from 'react'
import { useTasksStore } from '../store/tasks'
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import startOfWeek from 'date-fns/startOfWeek'
import getDay from 'date-fns/getDay'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './Planner.css'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

export default function Planner() {
  const tasks = useTasksStore((state) => state.tasks)
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
    <div className="planner-page">
      <div className="planner-header">
        <h1 className="h3 mb-0">Planner</h1>
        <div className="btn-group" role="group" aria-label="Planner view">
          <button
            type="button"
            className={`btn btn-sm ${plannerMode === 'day' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setPlannerMode('day')}
            data-testid="planner-day"
          >
            Day
          </button>
          <button
            type="button"
            className={`btn btn-sm ${plannerMode === 'week' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setPlannerMode('week')}
            data-testid="planner-week"
          >
            Week
          </button>
          <button
            type="button"
            className={`btn btn-sm ${plannerMode === 'month' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setPlannerMode('month')}
            data-testid="planner-month"
          >
            Month
          </button>
        </div>
      </div>

      <div className="planner-calendar-wrap">
        <div className="card">
          <BigCalendar
            localizer={localizer}
            events={plannerEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            views={['day', 'week', 'month']}
            defaultView={plannerMode}
            view={plannerMode}
            onView={(v: any) => setPlannerMode(v as any)}
          />
        </div>
      </div>
    </div>
  )
}
