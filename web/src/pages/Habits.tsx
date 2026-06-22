import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHabitsStore, Habit } from '../store/habits'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import './Habits.css'

export default function Habits() {
  const habits = useHabitsStore((state) => state.habits)
  const addHabit = useHabitsStore((state) => state.addHabit)
  const deleteHabit = useHabitsStore((state) => state.deleteHabit)
  const logCompletion = useHabitsStore((state) => state.logCompletion)

  const navigate = useNavigate()

  const [showForm, setShowForm] = useState(false)
  const [habitName, setHabitName] = useState('')
  const [habitColor, setHabitColor] = useState('#E72372')

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (habitName.trim()) {
      addHabit({ name: habitName.trim(), color: habitColor })
      setHabitName('')
      setHabitColor('#E72372')
      setShowForm(false)
    }
  }

  return (
    <div className="habits-page container-lg py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Habits</h1>
        <button
          className="btn btn-primary btn-sm d-flex align-items-center gap-1"
          onClick={() => setShowForm((v) => !v)}
          data-testid="add-habit-btn"
        >
          <Plus size={16} />
          Add Habit
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="card p-3 mb-4" data-testid="habit-form">
          <h2 className="h6 mb-3">New Habit</h2>
          <div className="mb-3">
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Morning Run"
              value={habitName}
              onChange={(e) => setHabitName(e.target.value)}
              autoFocus
              data-testid="habit-name-input"
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Colour</label>
            <input
              type="color"
              className="form-control form-control-color"
              value={habitColor}
              onChange={(e) => setHabitColor(e.target.value)}
              data-testid="habit-color-input"
            />
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-primary btn-sm" type="submit">
              Save
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {habits.length === 0 ? (
        <div className="alert alert-info">
          No habits yet. Tap <strong>Add Habit</strong> to create your first one!
        </div>
      ) : (
        <div className="row g-3">
          {habits.map((habit) => (
            <div key={habit.id} className="col-12">
              <HabitRow
                habit={habit}
                onLog={() => logCompletion(habit.id)}
                onEdit={() => navigate(`/habit/${habit.id}/edit`)}
                onDelete={() => deleteHabit(habit.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface HabitRowProps {
  habit: Habit
  onLog: () => void
  onEdit: () => void
  onDelete: () => void
}

function HabitRow({ habit, onLog, onEdit, onDelete }: HabitRowProps) {
  return (
    <div className="habit-row card" data-testid={`habit-row-${habit.id}`}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="d-flex align-items-center gap-2">
            <span
              className="habit-color-dot"
              style={{ backgroundColor: habit.color }}
            />
            <h3 className="card-title h6 mb-0">{habit.name}</h3>
          </div>
          <span className="badge bg-secondary">{habit.streak} 🔥</span>
        </div>

        <div className="progress mb-2" style={{ height: '20px' }}>
          <div
            className="progress-bar"
            role="progressbar"
            style={{ width: `${habit.progress * 100}%`, backgroundColor: habit.color }}
            aria-valuenow={habit.progress * 100}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">{(habit.progress * 100).toFixed(0)}% complete</small>
          <div className="d-flex gap-2">
            <button
              className="btn btn-sm"
              style={{ backgroundColor: habit.color, color: 'white', border: 'none' }}
              onClick={onLog}
              data-testid={`habit-log-${habit.id}`}
            >
              Log
            </button>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={onEdit}
              title="Edit"
              data-testid={`habit-edit-${habit.id}`}
            >
              <Edit2 size={14} />
            </button>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={onDelete}
              title="Delete"
              data-testid={`habit-delete-${habit.id}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
