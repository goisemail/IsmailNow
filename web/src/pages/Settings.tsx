import { useState } from 'react'
import { useHabitsStore } from '../store/habits'
import { useTasksStore } from '../store/tasks'
import { useAuth } from '../contexts/AuthContext'
import { Trash2 } from 'lucide-react'

export default function Settings() {
  const habits = useHabitsStore((state) => state.habits)
  const deleteHabit = useHabitsStore((state) => state.deleteHabit)
  const tasks = useTasksStore((state) => state.tasks)
  const deleteTask = useTasksStore((state) => state.deleteTask)

  const { user } = useAuth()
  const token = user?.accessToken ?? null

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleExport = () => {
    const data = {
      habits,
      tasks,
      exportDate: new Date().toISOString(),
    }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `habbitnow-backup-${new Date().toISOString().split('T')[0]}.json`
    link.click()
  }

  const visibleTasks = tasks.filter((t) => !t.isDeleted)

  return (
    <div className="container py-4">
      <h1 className="h3 mb-4">Settings</h1>

      {/* Data Management */}
      <div className="card mb-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">Data Management</h5>
        </div>
        <div className="card-body">
          <button className="btn btn-primary mb-3" onClick={handleExport} data-testid="exportBtn">
            📥 Export Data as JSON
          </button>
          <p className="text-muted small">
            Download all your habits and tasks as a backup
          </p>
        </div>
      </div>

      {/* Manage Habits */}
      <div className="card mb-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">Manage Habits ({habits.length})</h5>
        </div>
        <div className="card-body">
          {habits.length === 0 ? (
            <p className="text-muted">No habits to manage</p>
          ) : (
            <div className="list-group">
              {habits.map((habit) => (
                <div key={habit.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <span>{habit.name}</span>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() =>
                      confirmDelete === habit.id
                        ? (deleteHabit(habit.id), setConfirmDelete(null))
                        : setConfirmDelete(habit.id)
                    }
                    data-testid={`delete-habit-${habit.id}`}
                  >
                    {confirmDelete === habit.id ? '🗑️ Confirm' : <Trash2 size={16} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Manage Tasks */}
      <div className="card">
        <div className="card-header bg-light">
          <h5 className="mb-0">Manage Tasks ({visibleTasks.length})</h5>
        </div>
        <div className="card-body">
          {visibleTasks.length === 0 ? (
            <p className="text-muted">No tasks to manage</p>
          ) : (
            <div className="list-group">
              {visibleTasks.map((task) => (
                <div key={task.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <span>{task.title}</span>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() =>
                      confirmDelete === task.id
                        ? (deleteTask(task.id, token), setConfirmDelete(null))
                        : setConfirmDelete(task.id)
                    }
                    data-testid={`delete-task-${task.id}`}
                  >
                    {confirmDelete === task.id ? '🗑️ Confirm' : <Trash2 size={16} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-muted mt-4 text-center small">
        🔧 More settings coming soon...
      </p>
    </div>
  )
}
