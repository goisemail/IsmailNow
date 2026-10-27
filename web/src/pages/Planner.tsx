import { useState, useMemo } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer, type View } from 'react-big-calendar'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import startOfWeek from 'date-fns/startOfWeek'
import getDay from 'date-fns/getDay'
import { enUS } from 'date-fns/locale'
import type { Locale } from 'date-fns'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import PlannerToolbar from '../components/PlannerToolbar'
import PlanWizard from '../components/PlanWizard'
import { usePlansStore } from '../store/plans'
import { useSettingsStore } from '../store/settings'
import { buildEvent, planOccurrenceDates, type PlannerEvent } from '../utils/planner'
import './Planner.css'
import { Plus } from 'lucide-react'

const locales = { 'en-US': enUS }

const formatWithShortWeekday = (date: Date, formatStr: string, locale?: { locale?: Locale }) => {
  const resolvedLocale = locale?.locale ?? enUS
  // react-big-calendar renders full weekday names (e.g. "Tuesday") via the
  // 'cccc' token in day headers; collapse those to the 3-letter form so
  // headers read "Tue" instead of "Tuesday".
  const shortFormat = formatStr.replace(/cccc/g, 'ccc')
  return format(date, shortFormat, { locale: resolvedLocale })
}

const localizer = dateFnsLocalizer({ format: formatWithShortWeekday, parse, startOfWeek, getDay, locales })

const LINKED_TASK_COLOR = '#0D6EFD'
const LINKED_HABIT_COLOR = '#6F42C1'
const DEFAULT_START = '09:00'
const DEFAULT_END = '10:00'

export default function Planner() {
  const plannerDefaultView = useSettingsStore((state) => state.defaultPlannerView)
  const plans = usePlansStore((state) => state.plans)
  const [plannerMode, setPlannerMode] = useState<View>(plannerDefaultView)
  const [viewDate, setViewDate] = useState(() => new Date())
  const [planWizardOpen, setPlanWizardOpen] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [wizardDraft, setWizardDraft] = useState<{ date: string; startTime: string; endTime: string } | null>(null)

  const activePlans = plans.filter((plan) => !plan.isDeleted)

  const plannerEvents = useMemo(
    () => activePlans.flatMap((plan) => planOccurrenceDates(plan).map((dateKey) => buildEvent(plan, dateKey))),
    [activePlans],
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
            onSelectEvent={(event) => {
              setEditingPlanId(event.plannedId)
              setPlanWizardOpen(true)
            }}
            onSelectSlot={(slot) => {
              setViewDate(slot.start)
              setWizardDraft({
                date: format(slot.start, 'yyyy-MM-dd'),
                startTime: slot.start.toTimeString().slice(0, 5),
                endTime: slot.end.toTimeString().slice(0, 5),
              })
              setPlanWizardOpen(true)
            }}
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
        <Plus size={34} />
      </button>

      <PlanWizard
        open={planWizardOpen}
        onClose={() => {
          setPlanWizardOpen(false)
          setEditingPlanId(null)
          setWizardDraft(null)
        }}
        planToEdit={editingPlanId ? activePlans.find((p) => p.id === editingPlanId) : undefined}
        defaultDate={wizardDraft?.date ?? format(viewDate, 'yyyy-MM-dd')}
        defaultStartTime={wizardDraft?.startTime ?? DEFAULT_START}
        defaultEndTime={wizardDraft?.endTime ?? DEFAULT_END}
      />
    </div>
  )
}
