import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getHabitEntry,
  getHabitStats,
  todayLocal,
  useHabitsStore,
  type Habit,
  type HabitEntry,
  type HabitStats,
} from '../store/habits'
import { BarChart3, Edit2, Plus, Trash2 } from 'lucide-react'
import HabitWizard from '../components/HabitWizard'
import './Habits.css'

export default function Habits() {
  const storedHabits = useHabitsStore((state) => state.habits)
  const entries = useHabitsStore((state) => state.entries)
  const habits = storedHabits.filter((habit) => !habit.isDeleted && !habit.archivedAt)
  const addHabit = useHabitsStore((state) => state.addHabit)
  const deleteHabit = useHabitsStore((state) => state.deleteHabit)
  const logCompletion = useHabitsStore((state) => state.logCompletion)
  const updateHabit = useHabitsStore((state) => state.updateHabit)

  const navigate = useNavigate()

  const [wizardOpen, setWizardOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)

  const closeWizard = () => {
    setWizardOpen(false)
    setEditingHabit(null)
  }

  return (
    <div className="habits-page container-lg py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Habits</h1>
        <button
          className="btn btn-primary btn-sm d-flex align-items-center gap-1"
          onClick={() => { setEditingHabit(null); setWizardOpen(true) }}
          data-testid="add-habit-btn"
        >
          <Plus size={16} />
          Add Habit
        </button>
      </div>

      {habits.length === 0 ? (
        <div className="alert alert-info">
          No habits yet. Tap <strong>Add Habit</strong> to create your first one!
        </div>
      ) : (
        <div className="habit-list">
          {habits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              entry={getHabitEntry(entries, habit.id, todayLocal())}
              stats={getHabitStats(habit, entries)}
              onOpen={() => navigate(`/habit/${habit.id}`)}
              onLog={() => logCompletion(habit.id)}
              onEdit={() => { setEditingHabit(habit); setWizardOpen(true) }}
              onDelete={() => deleteHabit(habit.id)}
            />
          ))}
        </div>
      )}
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

interface HabitRowProps {
  habit: Habit
  entry?: HabitEntry
  stats: HabitStats
  onOpen: () => void
  onLog: () => void
  onEdit: () => void
  onDelete: () => void
}

function HabitRow({ habit, entry, stats, onOpen, onLog, onEdit, onDelete }: HabitRowProps) {
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
              {!habit.synced && <span className="habit-pending-dot" title="Pending sync">●</span>}
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
        <button
          className={`habit-counter-action${entry?.state === 'completed' ? ' done' : ''}`}
          style={{ '--habit-color': habit.color } as React.CSSProperties}
          onClick={(event) => { event.stopPropagation(); onLog() }}
          title="Add one to the counter"
          aria-label={`Log ${habit.name}`}
          data-testid={`habit-log-${habit.id}`}
        >
          {entry?.state === 'completed' ? '✓' : '+'}
        </button>
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
