import { useEffect, useRef, useState } from 'react'
import { todayLocal, type Habit, type HabitDraft, type HabitEvaluation } from '../store/habits'
import './TaskWizard.css'
import './HabitWizard.css'

interface HabitWizardProps {
  open: boolean
  onClose: () => void
  onSave: (habit: HabitDraft) => void | Promise<void>
  initialHabit?: Habit | null
  title?: string
}

const HABIT_COLORS = ['#E72372', '#FF9500', '#198754', '#0D6EFD', '#6F42C1', '#20C997']
const CATEGORIES = ['Health', 'Sports', 'Nutrition', 'Study', 'Work', 'Home', 'Meditation', 'Finance', 'Other']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const STEP_TITLES = ['Definition', 'Evaluation', 'Goal', 'Frequency', 'Settings']

export default function HabitWizard({ open, onClose, onSave, initialHabit, title }: HabitWizardProps) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#E72372')
  const [category, setCategory] = useState('Other')
  const [evaluationType, setEvaluationType] = useState<'binary' | 'counter'>('binary')
  const [criterion, setCriterion] = useState<'atLeast' | 'atMost' | 'exactly' | 'any'>('atLeast')
  const [target, setTarget] = useState(10)
  const [unit, setUnit] = useState('times')
  const [scheduleType, setScheduleType] = useState<'everyDay' | 'weekdays'>('everyDay')
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5])
  const [startDate, setStartDate] = useState(todayLocal())
  const [endDate, setEndDate] = useState('')
  const [priority, setPriority] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const evaluation = initialHabit?.evaluation
    setStep(0)
    setName(initialHabit?.name ?? '')
    setDescription(initialHabit?.description ?? '')
    setColor(initialHabit?.color ?? '#E72372')
    setCategory(initialHabit?.category ?? 'Other')
    setEvaluationType(evaluation?.type ?? 'binary')
    setCriterion(evaluation?.type === 'counter' ? evaluation.criterion : 'atLeast')
    setTarget(evaluation?.type === 'counter' ? evaluation.target : 10)
    setUnit(evaluation?.type === 'counter' ? evaluation.unit ?? 'times' : 'times')
    setScheduleType(initialHabit?.schedule.type ?? 'everyDay')
    setWeekdays(initialHabit?.schedule.type === 'weekdays' ? initialHabit.schedule.weekdays : [1, 2, 3, 4, 5])
    setStartDate(initialHabit?.startDate ?? todayLocal())
    setEndDate(initialHabit?.endDate ?? '')
    setPriority(initialHabit?.priority ?? 0)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [initialHabit, open])

  const evaluation: HabitEvaluation = evaluationType === 'binary'
    ? { type: 'binary' }
    : { type: 'counter', criterion, target: Math.max(1, target), unit: unit.trim() || undefined }

  const validStep = step === 0
    ? Boolean(name.trim())
    : step === 2
      ? evaluationType === 'binary' || criterion === 'any' || target > 0
      : step === 3
        ? scheduleType === 'everyDay' || weekdays.length > 0
        : step !== 4 || !endDate || endDate > startDate

  const submit = async () => {
    if (!validStep) return
    if (step < 4) {
      setStep((current) => current + 1)
      return
    }
    await onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      category,
      priority,
      evaluation,
      schedule: scheduleType === 'everyDay' ? { type: 'everyDay' } : { type: 'weekdays', weekdays },
      startDate,
      endDate: endDate || undefined,
    })
    onClose()
  }

  if (!open) return null

  return (
    <div className="task-wizard-overlay" onClick={(event) => event.target === event.currentTarget && onClose()} role="dialog" aria-modal="true">
      <div className="task-wizard-card habit-wizard-card">
        <div className="habit-wizard-progress" aria-label={`Step ${step + 1} of 5`}>
          {STEP_TITLES.map((label, index) => <span key={label} className={index <= step ? 'active' : ''} />)}
        </div>
        <h2 className="task-wizard-title">{title ?? (initialHabit ? 'Edit Habit' : 'Add Habit')}</h2>
        <p className="habit-wizard-step-title">{STEP_TITLES[step]}</p>

        {step === 0 && <div className="habit-wizard-fields">
          <label className="task-wizard-label">Habit name
            <input ref={inputRef} className="task-wizard-input" maxLength={250} value={name} onChange={(event) => setName(event.target.value)} data-testid="habitWizardInput" />
          </label>
          <label className="task-wizard-label">Description
            <textarea className="task-wizard-input habit-wizard-textarea" maxLength={800} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label className="task-wizard-label">Category
            <select className="task-wizard-input" value={category} onChange={(event) => setCategory(event.target.value)}>
              {CATEGORIES.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <div className="habit-wizard-swatches">
            {HABIT_COLORS.map((option) => <button key={option} type="button" className={`habit-wizard-swatch${color === option ? ' selected' : ''}`} style={{ backgroundColor: option }} onClick={() => setColor(option)} aria-label={`Use colour ${option}`} aria-pressed={color === option} />)}
          </div>
        </div>}

        {step === 1 && <div className="habit-wizard-choice-grid">
          <button type="button" className={evaluationType === 'binary' ? 'selected' : ''} onClick={() => setEvaluationType('binary')}><strong>Yes / No</strong><span>One check completes the day</span></button>
          <button type="button" className={evaluationType === 'counter' ? 'selected' : ''} onClick={() => setEvaluationType('counter')}><strong>Numeric counter</strong><span>Track a daily quantity</span></button>
        </div>}

        {step === 2 && (evaluationType === 'binary' ? <div className="habit-wizard-summary">A single check marks the scheduled day complete.</div> : <div className="habit-wizard-fields">
          <label className="task-wizard-label">Goal type
            <select className="task-wizard-input" value={criterion} onChange={(event) => setCriterion(event.target.value as typeof criterion)}>
              <option value="atLeast">At least</option><option value="atMost">At most</option><option value="exactly">Exactly</option><option value="any">Track any value</option>
            </select>
          </label>
          {criterion !== 'any' && <label className="task-wizard-label">Daily target
            <input type="number" min="1" step="1" className="task-wizard-input" value={target} onChange={(event) => setTarget(Number(event.target.value))} />
          </label>}
          <label className="task-wizard-label">Unit
            <input className="task-wizard-input" maxLength={150} value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="pages, glasses, km..." />
          </label>
        </div>)}

        {step === 3 && <div className="habit-wizard-fields">
          <div className="habit-wizard-choice-grid compact">
            <button type="button" className={scheduleType === 'everyDay' ? 'selected' : ''} onClick={() => setScheduleType('everyDay')}><strong>Every day</strong></button>
            <button type="button" className={scheduleType === 'weekdays' ? 'selected' : ''} onClick={() => setScheduleType('weekdays')}><strong>Specific weekdays</strong></button>
          </div>
          {scheduleType === 'weekdays' && <div className="habit-weekday-picker">{WEEKDAYS.map((day, index) => <button key={day} type="button" className={weekdays.includes(index) ? 'selected' : ''} onClick={() => setWeekdays((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index].sort())}>{day}</button>)}</div>}
        </div>}

        {step === 4 && <div className="habit-wizard-fields">
          <label className="task-wizard-label">Start date<input type="date" className="task-wizard-input" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label className="task-wizard-label">End date (optional)<input type="date" className="task-wizard-input" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
          <label className="task-wizard-label">Priority<input type="number" className="task-wizard-input" value={priority} onChange={(event) => setPriority(Number(event.target.value))} /></label>
        </div>}

        <div className="task-wizard-actions">
          <button type="button" className="task-wizard-btn task-wizard-btn--cancel" onClick={() => step ? setStep(step - 1) : onClose()}>{step ? 'Back' : 'Cancel'}</button>
          <button type="button" className="task-wizard-btn task-wizard-btn--ok" disabled={!validStep} onClick={submit} data-testid="habitWizardOk">{step === 4 ? 'Save' : 'Next'}</button>
        </div>
      </div>
    </div>
  )
}
