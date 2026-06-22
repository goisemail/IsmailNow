import { useState } from 'react'
import { useTasksStore, PendingTask } from '../store/tasks'
import { Plus, Trash2 } from 'lucide-react'
import { formatDate } from '../utils/date'
import './Tasks.css'

export default function Tasks() {
  const tasks = useTasksStore((state) => state.tasks)
  const addTask = useTasksStore((state) => state.addTask)
  const toggleTaskCompletion = useTasksStore((state) => state.toggleTaskCompletion)
  const deleteTask = useTasksStore((state) => state.deleteTask)

  const today = formatDate(new Date())

  const [showForm, setShowForm] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDate, setTaskDate] = useState(today)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (taskTitle.trim()) {
      addTask(taskTitle.trim(), taskDate)
      setTaskTitle('')
      setTaskDate(today)
      setShowForm(false)
    }
  }

  const pending = tasks.filter((t) => !t.completedDate)
  const completed = tasks.filter((t) => !!t.completedDate)

  return (
    <div className="tasks-page container-lg py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Tasks</h1>
        <button
          className="btn btn-primary btn-sm d-flex align-items-center gap-1"
          onClick={() => setShowForm((v) => !v)}
          data-testid="add-task-btn"
        >
          <Plus size={16} />
          Add Task
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="card p-3 mb-4" data-testid="task-form">
          <h2 className="h6 mb-3">New Task</h2>
          <div className="mb-3">
            <label className="form-label">Title</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Buy groceries"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              autoFocus
              data-testid="task-title-input"
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-control"
              value={taskDate}
              onChange={(e) => setTaskDate(e.target.value)}
              data-testid="task-date-input"
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

      {tasks.length === 0 ? (
        <div className="alert alert-info">
          No tasks yet. Tap <strong>Add Task</strong> to create your first one!
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <section className="mb-4">
              <h2 className="h6 text-muted mb-2">Pending ({pending.length})</h2>
              <div className="list-group">
                {pending.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    today={today}
                    onToggle={() => toggleTaskCompletion(task.id, today)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <h2 className="h6 text-muted mb-2">Completed ({completed.length})</h2>
              <div className="list-group">
                {completed.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    today={today}
                    onToggle={() => toggleTaskCompletion(task.id, task.completedDate!)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

interface TaskRowProps {
  task: PendingTask
  today: string
  onToggle: () => void
  onDelete: () => void
}

function TaskRow({ task, onToggle, onDelete }: TaskRowProps) {
  const isDone = !!task.completedDate

  return (
    <label
      className="list-group-item d-flex align-items-center gap-3"
      data-testid={`task-row-${task.id}`}
    >
      <input
        className="form-check-input flex-shrink-0"
        type="checkbox"
        checked={isDone}
        onChange={onToggle}
      />
      <span
        className={`flex-grow-1 ${isDone ? 'text-decoration-line-through text-muted' : ''}`}
      >
        {task.title}
      </span>
      <span className="text-muted small flex-shrink-0">{task.startDate}</span>
      <button
        className="btn btn-sm btn-outline-danger flex-shrink-0"
        type="button"
        onClick={(e) => {
          e.preventDefault()
          onDelete()
        }}
        title="Delete"
        data-testid={`task-delete-${task.id}`}
      >
        <Trash2 size={14} />
      </button>
    </label>
  )
}
