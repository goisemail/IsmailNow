import { useState, useRef, useEffect } from 'react'
import type { HabitDraft } from '../store/habits'
import { useHabitsStore } from '../store/habits'
import { usePlansStore } from '../store/plans'
import type { PendingPlan } from '../store/plans'
import { useTasksStore } from '../store/tasks'
import { planOccurrenceDates } from '../utils/planner'
import HabitWizard from './HabitWizard'
import './TaskWizard.css'
import './PlanWizard.css'

interface PlanWizardProps {
  open: boolean
  onClose: () => void
  defaultDate: string
  defaultStartTime?: string
  defaultEndTime?: string
  planToEdit?: PendingPlan
}

type WizardPhase = 'plan' | 'habit'

const DEFAULT_START = '09:00'
const DEFAULT_END = '10:00'
const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]
const WEEKDAY_OPTIONS = [
  { day: 1, label: 'M' },
  { day: 2, label: 'T' },
  { day: 3, label: 'W' },
  { day: 4, label: 'T' },
  { day: 5, label: 'F' },
  { day: 6, label: 'S' },
  { day: 0, label: 'S' },
]

export default function PlanWizard({
  open,
  onClose,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
  planToEdit,
}: PlanWizardProps) {
  const [title, setTitle] = useState('')
  const [day, setDay] = useState(defaultDate)
  const [startTime, setStartTime] = useState(DEFAULT_START)
  const [endTime, setEndTime] = useState(DEFAULT_END)
  const [isRepeating, setIsRepeating] = useState(false)
  const [repeatDays, setRepeatDays] = useState<number[]>(ALL_WEEKDAYS)
  const [repeatEndDate, setRepeatEndDate] = useState('')
  const [addAsTask, setAddAsTask] = useState(false)
  const [addAsHabit, setAddAsHabit] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [phase, setPhase] = useState<WizardPhase>('plan')
  const [planId, setPlanId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setPhase('plan')
    setShowErrors(false)
    if (planToEdit) {
      setPlanId(planToEdit.id)
      setTitle(planToEdit.title)
      setDay(planToEdit.startDate)
      setStartTime(planToEdit.startTime)
      setEndTime(planToEdit.endTime)
      setIsRepeating(planToEdit.isRepeating === true)
      setRepeatDays(planToEdit.repeatDays ?? ALL_WEEKDAYS)
      setRepeatEndDate(planToEdit.endDate ?? '')
    } else {
      setPlanId(null)
      setTitle('')
      setDay(defaultDate)
      setStartTime(defaultStartTime ?? DEFAULT_START)
      setEndTime(defaultEndTime ?? DEFAULT_END)
      setIsRepeating(false)
      setRepeatDays(ALL_WEEKDAYS)
      setRepeatEndDate('')
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(timer)
  }, [open, planToEdit, defaultDate, defaultStartTime, defaultEndTime])

  useEffect(() => {
    if (!open || phase !== 'plan') return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, phase, onClose])

  if (!open) return null

  const titleValid = title.trim().length > 0
  const timesValid = Boolean(startTime) && Boolean(endTime) && endTime > startTime
  const repeatValid = !isRepeating || (repeatEndDate !== '' && repeatEndDate >= day)
  const formValid = titleValid && timesValid && repeatValid && !(addAsTask && addAsHabit)

  const resetAndClose = () => {
    setPhase('plan')
    setPlanId(null)
    setShowErrors(false)
    onClose()
  }

  const handlePlanSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setShowErrors(true)
    if (!formValid) return

    const planTitle = title.trim()

    if (planId) {
      usePlansStore.getState().updatePlan(planId, {
        title: planTitle,
        startDate: day,
        startTime,
        endTime,
        endDate: isRepeating ? repeatEndDate : null,
        isRepeating,
        repeatDays: isRepeating ? repeatDays : null,
      })
      resetAndClose()
      return
    }

    const newPlanId = usePlansStore.getState().addPlan({
      title: planTitle,
      startDate: day,
      startTime,
      endTime,
      endDate: isRepeating ? repeatEndDate : null,
      isRepeating,
      repeatDays: isRepeating ? repeatDays : null,
    })
    setPlanId(newPlanId)

    if (addAsTask) {
      const createdPlan = usePlansStore.getState().plans.find((plan) => plan.id === newPlanId)
      const occurrenceDates = createdPlan ? planOccurrenceDates(createdPlan) : [day]
      const taskIds: string[] = []
      for (const occurrenceDate of occurrenceDates) {
        taskIds.push(await useTasksStore.getState().addTask(planTitle, occurrenceDate))
      }
      usePlansStore.getState().updatePlan(newPlanId, { linkedTaskIds: taskIds })
      resetAndClose()
    } else if (addAsHabit) {
      setPhase('habit')
    } else {
      resetAndClose()
    }
  }

  const handleHabitSaved = (draft: HabitDraft) => {
    const habitId = useHabitsStore.getState().addHabit(draft)
    if (planId) usePlansStore.getState().updatePlan(planId, { linkedHabitId: habitId })
    resetAndClose()
  }

  const handleDelete = () => {
    if (planId) usePlansStore.getState().deletePlan(planId)
    resetAndClose()
  }

  if (phase === 'habit') {
    return (
      <HabitWizard
        open
        onClose={resetAndClose}
        onSave={handleHabitSaved}
        title="Add Habit"
      />
    )
  }

  return (
    <div
      className="task-wizard-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-wizard-title"
    >
      <div className="task-wizard-card">
        <h2 className="task-wizard-title" id="plan-wizard-title">Plan your time</h2>

        <form onSubmit={handlePlanSubmit}>

          <div>
          <label className="task-wizard-label" htmlFor="plan-wizard-title-input">
            Planner name
          </label>
          <input
            id="plan-wizard-title-input"
            //ref={inputRef}
            type="text"
            className="task-wizard-input"
            placeholder="e.g. Morning workout"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            data-testid="planWizardName"
          />
          {showErrors && !titleValid && (
            <p className="plan-wizard-error">Give the plan a name.</p>
          )}
          </div>

          <div>
          <label className="task-wizard-label" htmlFor="plan-wizard-day">
            Day
          </label>
          <input
            id="plan-wizard-day"
            type="date"
            className="task-wizard-input"
            value={day}
            onChange={(event) => setDay(event.target.value)}
            data-testid="planWizardDay"
          />
          </div>

          <div>
            <label className="task-wizard-label" htmlFor="plan-wizard-start">
              Start time
            </label>
            <input
              id="plan-wizard-start"
              type="time"
              className="task-wizard-input"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              data-testid="planWizardStart"
            />
          </div>

          <div>
            <label className="task-wizard-label" htmlFor="plan-wizard-end">
              End time
            </label>
            <input
              id="plan-wizard-end"
              type="time"
              className="task-wizard-input"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              data-testid="planWizardEnd"
            />
            {showErrors && !timesValid && (
            <p className="plan-wizard-error">End time must be after the start time.</p>
              )}
          </div>


          <label className="plan-wizard-checkbox">
            <input
              type="checkbox"
              checked={isRepeating}
              onChange={(event) => setIsRepeating(event.target.checked)}
              data-testid="planWizardRepeat"
            />
            Repeats
          </label>
          {isRepeating && (
            <>
              <span className="task-wizard-label plan-wizard-repeat-label">Repeat on</span>
              <div className="plan-wizard-weekday-picker" role="group" aria-label="Repeat on days">
                {WEEKDAY_OPTIONS.map(({ day, label }) => (
                  <button
                    key={day}
                    type="button"
                    className={`plan-wizard-weekday${repeatDays.includes(day) ? ' selected' : ''}`}
                    onClick={() => setRepeatDays((current) => current.includes(day)
                      ? current.filter((value) => value !== day)
                      : [...current, day].sort((left, right) => left - right))}
                    aria-pressed={repeatDays.includes(day)}
                    aria-label={`Repeat on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]}`}
                    data-testid={`planWizardDay-${day}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label className="task-wizard-label" htmlFor="plan-wizard-repeat-end">
                Repeat until
              </label>
              <input
                id="plan-wizard-repeat-end"
                type="date"
                className="task-wizard-input"
                value={repeatEndDate}
                onChange={(event) => setRepeatEndDate(event.target.value)}
                data-testid="planWizardRepeatEnd"
              />
              {showErrors && !repeatValid && (
                <p className="plan-wizard-error">Repeat end date must be on or after the day.</p>
              )}
            </>
          )}

          <div className="plan-wizard-links">
            <label className="plan-wizard-checkbox">
              <input
                type="checkbox"
                checked={addAsTask}
                onChange={(event) => { setAddAsTask(event.target.checked); setAddAsHabit(false) }}
                data-testid="planWizardAddTask"
              />
              Also add as Task
            </label>
            <label className="plan-wizard-checkbox">
              <input
                type="checkbox"
                checked={addAsHabit}
                onChange={(event) => { setAddAsHabit(event.target.checked); setAddAsTask(false) }}
                data-testid="planWizardAddHabit"
              />
              Also add as Habit
            </label>
          </div>

          <div className="task-wizard-actions">
            <button
              type="button"
              className="task-wizard-btn task-wizard-btn--cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            {planToEdit && (
              <button
                type="button"
                className="plan-delete-btn"
                onClick={handleDelete}
                data-testid="planWizardDelete"
              >
                Delete
              </button>
            )}
            <button
              type="submit"
              className="task-wizard-btn task-wizard-btn--ok"
              data-testid="planWizardSave"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
