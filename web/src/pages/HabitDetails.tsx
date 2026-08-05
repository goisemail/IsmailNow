import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getHabitEntry, getHabitStats, todayLocal, useHabitsStore } from '../store/habits'
import { ArrowLeft, Edit2 } from 'lucide-react'
import HabitWizard from '../components/HabitWizard'
import './HabitDetails.css'

export default function HabitDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const habits = useHabitsStore((state) => state.habits)
  const entries = useHabitsStore((state) => state.entries)
  const logCompletion = useHabitsStore((state) => state.logCompletion)
  const updateHabit = useHabitsStore((state) => state.updateHabit)
  const [editOpen, setEditOpen] = useState(false)

  const habit = habits.find((h) => h.id === id && !h.isDeleted)

  if (!habit) {
    return (
      <div className="container py-4">
        <button
          className="btn btn-outline-secondary btn-sm mb-3"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="alert alert-danger">Habit not found</div>
      </div>
    )
  }

  const today = todayLocal()
  const entry = getHabitEntry(entries, habit.id, today)
  const stats = getHabitStats(habit, entries)
  const target = habit.evaluation.type === 'binary' ? 1 : habit.evaluation.target
  const count = entry?.value ?? 0
  const segmentCount = Math.min(Math.max(Math.round(target), 1), 20)
  const filledSegments = Math.round(Math.min(1, count / target) * segmentCount)
  const lastLogged = entries
    .filter((candidate) => candidate.habitId === habit.id && !candidate.isDeleted)
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.date

  return (
    <div className="habit-details container-lg py-4">
      <div className="habit-details-toolbar">
        <button className="habit-back-btn" onClick={() => navigate('/habits')} aria-label="Back to habits">
          <ArrowLeft size={20} />
        </button>
        <div className="habit-details-title">
          <span className="habit-details-color" style={{ backgroundColor: habit.color }} />
          <div>
            <h1>{habit.name}</h1>
            <span>Statistics</span>
          </div>
        </div>
        <button className="habit-edit-link" onClick={() => setEditOpen(true)}>
          <Edit2 size={16} /> Edit
        </button>
      </div>

      <section className="habit-stats-panel">
        <div className="habit-stats-grid">
          <div><span>Today</span><strong>{count}<small>/{target}</small></strong></div>
          <div><span>Current streak</span><strong>{stats.currentStreak}<small> days</small></strong></div>
          <div><span>Success rate</span><strong>{stats.successRate}<small>%</small></strong></div>
          <div><span>Last logged</span><strong className="habit-stat-date">{lastLogged ?? 'Not yet'}</strong></div>
        </div>

        <div
          className="habit-counter-visual"
          style={{ gridTemplateColumns: `repeat(${segmentCount}, 1fr)` }}
          aria-label={`${count} out of ${target} completed`}
        >
          {Array.from({ length: segmentCount }, (_, index) => (
            <span key={index} className={index < filledSegments ? 'filled' : ''} style={{ '--habit-color': habit.color } as React.CSSProperties} />
          ))}
        </div>

        <button
          className="habit-stat-log-btn"
          style={{ backgroundColor: habit.color }}
          onClick={() => logCompletion(habit.id, today)}
          data-testid="logCompletionBtn"
        >
          {entry?.state === 'completed' ? 'Completed ✓' : `Record progress (${count}/${target})`}
        </button>
      </section>
      <HabitWizard
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={(draft) => updateHabit(habit.id, draft)}
        initialHabit={habit}
        title="Edit Habit"
      />
    </div>
  )
}
