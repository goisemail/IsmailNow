import { useHabitsStore } from '../store/habits'
import { useTasksStore } from '../store/tasks'

export default function History() {
  const habits = useHabitsStore((state) => state.habits)
  const tasks = useTasksStore((state) => state.tasks)

  return (
    <div className="container py-4">
      <h1 className="h3 mb-4">History & Analytics</h1>

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card p-4 text-center">
            <div className="text-muted small mb-2">Total Habits</div>
            <div className="h2">{habits.length}</div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card p-4 text-center">
            <div className="text-muted small mb-2">Total Tasks</div>
            <div className="h2">{tasks.length}</div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="h5 mb-3">Top Streaks</h3>
        {habits
          .sort((a, b) => b.streak - a.streak)
          .slice(0, 5)
          .map((habit) => (
            <div key={habit.id} className="d-flex justify-content-between mb-3 pb-3 border-bottom">
              <span>{habit.name}</span>
              <span className="badge bg-primary">{habit.streak} 🔥</span>
            </div>
          ))}
      </div>

      <p className="text-muted mt-4 text-center">
        📊 Detailed analytics coming soon...
      </p>
    </div>
  )
}
