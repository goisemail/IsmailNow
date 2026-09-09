import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getHabitDisplayState,
  getHabitEntry,
  getHabitStats,
  habitIsDueOnDate,
  nextBinaryHabitState,
  todayLocal,
  useHabitsStore,
  type Habit,
  type HabitDisplayState,
  type HabitEntry,
  type HabitStats,
} from '../store/habits'
import { BarChart3, Edit2, Trash2 } from 'lucide-react'
import HabitWizard from '../components/HabitWizard'
import HabitStateControl from '../components/HabitStateControl'
import './Habits.css'

export default function Habits() {
  const storedHabits = useHabitsStore((state) => state.habits)
  const entries = useHabitsStore((state) => state.entries)
  const pendingHabitIds = new Set(entries.filter((entry) => !entry.synced).map((entry) => entry.habitId))
  const addHabit = useHabitsStore((state) => state.addHabit)
  const deleteHabit = useHabitsStore((state) => state.deleteHabit)
  const logCompletion = useHabitsStore((state) => state.logCompletion)
  const setEntryState = useHabitsStore((state) => state.setEntryState)
  const updateHabit = useHabitsStore((state) => state.updateHabit)

  const navigate = useNavigate()

  const [wizardOpen, setWizardOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const today = todayLocal()
  const habits = storedHabits.filter((habit) => !habit.isDeleted)
  const ongoingHabits = habits.filter((habit) => !habit.archivedAt && (!habit.endDate || habit.endDate >= today))
  const finishedHabits = habits
    .filter((habit) => Boolean(habit.archivedAt) || Boolean(habit.endDate && habit.endDate < today))
    .sort((left, right) => (right.archivedAt ?? right.endDate ?? '').localeCompare(left.archivedAt ?? left.endDate ?? ''))

  const closeWizard = () => {
    setWizardOpen(false)
    setEditingHabit(null)
  }

  return (
    <div className="habits-page container-lg py-4">
      <div className="mb-4">
        <h1 className="h3 mb-0">Habits</h1>
      </div>

      {habits.length === 0 ? (
        <div className="alert alert-info">
          No habits yet. Tap <strong>Add Habit</strong> to create your first one!
        </div>
      ) : (
        <>
          {ongoingHabits.length > 0 && (
            <HabitSection
              title="Ongoing"
              habits={ongoingHabits}
              entries={entries}
              today={today}
              pendingHabitIds={pendingHabitIds}
              onOpen={(habit) => navigate(`/habit/${habit.id}`)}
              onState={(habit, displayState) => {
                if (habit.evaluation.type === 'counter') logCompletion(habit.id, today)
                else setEntryState(habit.id, today, nextBinaryHabitState(displayState))
              }}
              onEdit={(habit) => { setEditingHabit(habit); setWizardOpen(true) }}
              onDelete={deleteHabit}
            />
          )}
          {finishedHabits.length > 0 && (
            <HabitSection
              title="Finished"
              habits={finishedHabits}
              entries={entries}
              today={today}
              pendingHabitIds={pendingHabitIds}
              finished
              onOpen={(habit) => navigate(`/habit/${habit.id}`)}
              onState={() => undefined}
              onEdit={(habit) => { setEditingHabit(habit); setWizardOpen(true) }}
              onDelete={deleteHabit}
            />
          )}
        </>
      )}
      <button
        className="fab"
        type="button"
        onClick={() => { setEditingHabit(null); setWizardOpen(true) }}
        aria-label="Add habit"
        data-testid="add-habit-fab"
      >
        +
      </button>
      <HabitWizard
        open={wizardOpen}
        onClose={closeWizard}
        onSave={(draft) => {
          if (editingHabit) updateHabit(editingHabit.id, draft)
          else addHabit(draft)
        }}
        initialHabit={editingHabit}
        title={editingHabit ? 'Edit Habit' : 'Add Habit'}
      />
    </div>
  )
}

interface HabitSectionProps {
  title: string
  habits: Habit[]
  entries: HabitEntry[]
  today: string
  pendingHabitIds: Set<string>
  finished?: boolean
  onOpen: (habit: Habit) => void
  onState: (habit: Habit, displayState: HabitDisplayState) => void
  onEdit: (habit: Habit) => void
  onDelete: (id: string) => void
}

function HabitSection({ title, habits, entries, today, pendingHabitIds, finished, onOpen, onState, onEdit, onDelete }: HabitSectionProps) {
  return (
    <section className="mb-4">
      <h2 className="h6 text-muted mb-2">{title} ({habits.length})</h2>
      <div className="habit-list">
        {habits.map((habit) => {
          const entry = getHabitEntry(entries, habit.id, today)
          const displayState = getHabitDisplayState(habit, entry, today)
          return (
            <HabitRow
              key={habit.id}
              habit={habit}
              entry={entry}
              pendingSync={!habit.synced || pendingHabitIds.has(habit.id)}
              displayState={displayState}
              due={!finished && habitIsDueOnDate(habit, today)}
              finished={finished}
              stats={getHabitStats(habit, entries)}
              onOpen={() => onOpen(habit)}
              onState={() => onState(habit, displayState)}
              onEdit={() => onEdit(habit)}
              onDelete={() => onDelete(habit.id)}
            />
          )
        })}
      </div>
    </section>
  )
}

interface HabitRowProps {
  habit: Habit
  entry?: HabitEntry
  pendingSync: boolean
  displayState: HabitDisplayState
  due: boolean
  finished?: boolean
  stats: HabitStats
  onOpen: () => void
  onState: () => void
  onEdit: () => void
  onDelete: () => void
}

function HabitRow({ habit, entry, pendingSync, displayState, due, finished, stats, onOpen, onState, onEdit, onDelete }: HabitRowProps) {
  const target = habit.evaluation.type === 'binary' ? 1 : habit.evaluation.target
  const count = entry?.value ?? 0
  return (
    <div
      className="habit-manage-row"
      data-testid={`habit-row-${habit.id}`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      role="link"
      tabIndex={0}
    >
      <span className="habit-color-bar" style={{ backgroundColor: habit.color }} aria-hidden="true" />
      <div className="habit-manage-main">
        <div className="habit-manage-heading">
          <div className="habit-manage-title-wrap">
            <span className="habit-item-title">
              {habit.name}
              {pendingSync && <span className="habit-pending-dot" title="Pending sync">●</span>}
            </span>
            <span className="habit-stat-hint"><BarChart3 size={13} /> View statistics</span>
          </div>
          <span className="habit-counter">{count}<small>/{target}</small></span>
        </div>
        <div className="habit-manage-metrics">
          <span>🔥 <strong>{stats.currentStreak}</strong> streak</span>
          <span>✓ <strong>{stats.successRate}%</strong> success</span>
        </div>
      </div>
      <div className="habit-row-actions">
        {finished ? (
          <span className="habit-finished-badge">Finished</span>
        ) : (
          <span onClick={(event) => event.stopPropagation()}>
            <HabitStateControl
              state={displayState}
              onClick={onState}
              disabled={!due}
              label={due ? `Set state for ${habit.name}` : `${habit.name} is not scheduled today`}
              testId={`habit-log-${habit.id}`}
            />
          </span>
        )}
        <button className="habit-action-btn" onClick={(event) => { event.stopPropagation(); onEdit() }} title="Edit" data-testid={`habit-edit-${habit.id}`}>
          <Edit2 size={15} />
        </button>
        <button className="habit-action-btn danger" onClick={(event) => { event.stopPropagation(); onDelete() }} title="Delete" data-testid={`habit-delete-${habit.id}`}>
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}
