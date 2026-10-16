import { useState, useRef, useEffect } from 'react'
import type { HabitDraft } from '../store/habits'
import { useHabitsStore } from '../store/habits'
import { usePlansStore } from '../store/plans'
import { useTasksStore } from '../store/tasks'
import TaskWizard from './TaskWizard'
import HabitWizard from './HabitWizard'
import './TaskWizard.css'
import './PlanWizard.css'

interface PlanWizardProps {
  open: boolean
  onClose: () => void
  defaultDate: string
}

type WizardPhase = 'plan' | 'task' | 'habit'

const DEFAULT_START = '09:00'
const DEFAULT_END = '10:00'

export default function PlanWizard({ open, onClose, defaultDate }: PlanWizardProps) {
  const [title, setTitle] = useState('')
  const [day, setDay] = useState(defaultDate)
  const [startTime, setStartTime] = useState(DEFAULT_START)
  const [endTime, setEndTime] = useState(DEFAULT_END)
  const [isRepeating, setIsRepeating] = useState(false)
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
    setPlanId(null)
    setShowErrors(false)
    setTitle('')
    setDay(defaultDate)
    setStartTime(DEFAULT_START)
    setEndTime(DEFAULT_END)
    setIsRepeating(false)
    setRepeatEndDate('')
    setAddAsTask(false)
    setAddAsHabit(false)
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(timer)
  }, [open, defaultDate])

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
  const formValid = titleValid && timesValid && repeatValid

  const resetAndClose = () => {
    setPhase('plan')
    setPlanId(null)
    setShowErrors(false)
    onClose()
  }

  const handlePlanSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setShowErrors(true)
    if (!formValid) return

    const id = usePlansStore.getState().addPlan({
      title: title.trim(),
      startDate: day,
      startTime,
      endTime,
      endDate: isRepeating ? repeatEndDate : null,
      isRepeating,
    })
    setPlanId(id)

    if (addAsTask) setPhase('task')
    else if (addAsHabit) setPhase('habit')
    else resetAndClose()
  }

  const handleTaskSaved = async (taskName: string) => {
    const taskId = await useTasksStore.getState().addTask(taskName, day)
    if (planId) usePlansStore.getState().updatePlanLinks(planId, { linkedTaskId: taskId })
    if (addAsHabit) setPhase('habit')
    else resetAndClose()
  }

  const handleTaskCancelled = () => {
    if (addAsHabit) setPhase('habit')
    else resetAndClose()
  }

  const handleHabitSaved = (draft: HabitDraft) => {
    const habitId = useHabitsStore.getState().addHabit(draft)
    if (planId) usePlansStore.getState().updatePlanLinks(planId, { linkedHabitId: habitId })
    resetAndClose()
  }

  if (phase === 'task') {
    return (
      <TaskWizard
        open
        onClose={handleTaskCancelled}
        onSave={handleTaskSaved}
        initialName={title.trim()}
        title="Add Task"
      />
    )
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
          <label className="task-wizard-label" htmlFor="plan-wizard-title-input">
            Planner name
          </label>
          <input
            id="plan-wizard-title-input"
            ref={inputRef}
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

          <div className="plan-wizard-time-row">
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
            </div>
          </div>
          {showErrors && !timesValid && (
            <p className="plan-wizard-error">End time must be after the start time.</p>
          )}

          <label className="plan-wizard-checkbox">
            <input
              type="checkbox"
              checked={isRepeating}
              onChange={(event) => setIsRepeating(event.target.checked)}
              data-testid="planWizardRepeat"
            />
            Repeats daily
          </label>
          {isRepeating && (
            <>
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
                onChange={(event) => setAddAsTask(event.target.checked)}
                data-testid="planWizardAddTask"
              />
              Also add as Task
            </label>
            <label className="plan-wizard-checkbox">
              <input
                type="checkbox"
                checked={addAsHabit}
                onChange={(event) => setAddAsHabit(event.target.checked)}
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
