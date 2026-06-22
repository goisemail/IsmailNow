import { useParams, useNavigate } from 'react-router-dom'
import { useHabitsStore } from '../store/habits'
import { ArrowLeft } from 'lucide-react'

export default function HabitDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const habits = useHabitsStore((state) => state.habits)
  const logCompletion = useHabitsStore((state) => state.logCompletion)

  const habit = habits.find((h) => h.id === id)

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

  return (
    <div className="container py-4">
      <button
        className="btn btn-outline-secondary btn-sm mb-3"
        onClick={() => navigate('/')}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="card p-4">
        <h1 className="h3 mb-4">{habit.name}</h1>

        <div className="row g-3 mb-4">
          <div className="col-6">
            <div className="text-muted small">Streak</div>
            <div className="h4 mb-0">{habit.streak} 🔥</div>
          </div>
          <div className="col-6">
            <div className="text-muted small">Progress</div>
            <div className="h4 mb-0">{(habit.progress * 100).toFixed(0)}%</div>
          </div>
        </div>

        <div className="progress mb-4" style={{ height: '40px' }}>
          <div
            className="progress-bar"
            role="progressbar"
            style={{
              width: `${habit.progress * 100}%`,
              backgroundColor: habit.color,
            }}
            aria-valuenow={habit.progress * 100}
            aria-valuemin={0}
            aria-valuemax={100}
          ></div>
        </div>

        <button
          className="btn btn-lg w-100"
          style={{
            backgroundColor: habit.color,
            color: 'white',
            border: 'none',
          }}
          onClick={() => {
            logCompletion(habit.id)
            navigate('/')
          }}
          data-testid="logCompletionBtn"
        >
          Log Completion
        </button>
      </div>
    </div>
  )
}
