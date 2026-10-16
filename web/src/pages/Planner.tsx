import { useState, useMemo } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer, type View } from 'react-big-calendar'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import startOfWeek from 'date-fns/startOfWeek'
import getDay from 'date-fns/getDay'
import eachDayOfInterval from 'date-fns/eachDayOfInterval'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import PlannerToolbar from '../components/PlannerToolbar'
import PlanWizard from '../components/PlanWizard'
import { usePlansStore, type PendingPlan } from '../store/plans'
import './Planner.css'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

interface PlannerEvent {
  id: string
  title: string
  start: Date
  end: Date
  linkedTask: boolean
  linkedHabit: boolean
}

const LINKED_TASK_COLOR = '#0D6EFD'
const LINKED_HABIT_COLOR = '#6F42C1'

function planOccurrenceDates(plan: PendingPlan): string[] {
  if (!plan.isRepeating) return [plan.startDate]
  const end = plan.endDate && plan.endDate > plan.startDate ? plan.endDate : plan.startDate
  return eachDayOfInterval({
    start: new Date(`${plan.startDate}T00:00:00`),
    end: new Date(`${end}T00:00:00`),
  }).map((day) => format(day, 'yyyy-MM-dd'))
}

function buildEvent(plan: PendingPlan, dateKey: string): PlannerEvent {
  const [startHour, startMinute] = plan.startTime.split(':').map(Number)
  const [endHour, endMinute] = plan.endTime.split(':').map(Number)
  const start = new Date(`${dateKey}T00:00:00`)
  start.setHours(startHour, startMinute, 0, 0)
  const end = new Date(start)
  end.setHours(endHour, endMinute, 0, 0)
  return {
    id: `${plan.id}:${dateKey}`,
    title: plan.title,
    start,
    end,
    linkedTask: Boolean(plan.linkedTaskId),
    linkedHabit: Boolean(plan.linkedHabitId),
  }
}

export default function Planner() {
  const plans = usePlansStore((state) => state.plans)
  const [plannerMode, setPlannerMode] = useState<View>('week')
  const [viewDate, setViewDate] = useState(() => new Date())
  const [planWizardOpen, setPlanWizardOpen] = useState(false)

  const plannerEvents = useMemo(
    () => plans.flatMap((plan) => planOccurrenceDates(plan).map((dateKey) => buildEvent(plan, dateKey))),
    [plans],
  )

  const eventPropGetter = (event: PlannerEvent) => {
    if (event.linkedHabit) {
      return { style: { backgroundColor: LINKED_HABIT_COLOR, borderColor: LINKED_HABIT_COLOR } }
    }
    if (event.linkedTask) {
      return { style: { backgroundColor: LINKED_TASK_COLOR, borderColor: LINKED_TASK_COLOR } }
    }
    return { style: {} }
  }

  return (
    <div className="planner-page">
      <div className="planner-header">
        <h1 className="h3 mb-0">Planner</h1>
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
            components={{ toolbar: PlannerToolbar }}
            view={plannerMode}
            onView={setPlannerMode}
            onNavigate={(date) => setViewDate(date)}
            eventPropGetter={eventPropGetter}
          />
        </div>
      </div>

      <button
        className="fab"
        type="button"
        onClick={() => setPlanWizardOpen(true)}
        aria-label="Plan your time"
        data-testid="planner-fab"
      >
        +
      </button>

      <PlanWizard
        open={planWizardOpen}
        onClose={() => setPlanWizardOpen(false)}
        defaultDate={format(viewDate, 'yyyy-MM-dd')}
      />
    </div>
  )
}
