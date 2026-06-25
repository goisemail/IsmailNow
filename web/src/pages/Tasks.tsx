import { useState } from 'react'
import { useTasksStore, PendingTask } from '../store/tasks'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Trash2 } from 'lucide-react'
import { formatDate } from '../utils/date'
import { getReadableTextColor } from '../utils/color'
import './Tasks.css'

export default function Tasks() {
  const tasks = useTasksStore((state) => state.tasks)
  const addTask = useTasksStore((state) => state.addTask)
  const markComplete = useTasksStore((state) => state.markComplete)
  const unmarkComplete = useTasksStore((state) => state.unmarkComplete)
  const deleteTask = useTasksStore((state) => state.deleteTask)

  const { user } = useAuth()
  const token = user?.accessToken ?? null

  const today = formatDate(new Date())

  const [showForm, setShowForm] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDate, setTaskDate] = useState(today)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (taskTitle.trim()) {
      addTask(taskTitle.trim(), taskDate, token)
      setTaskTitle('')
      setTaskDate(today)
      setShowForm(false)
    }
  }

  const handleToggle = (task: PendingTask) => {
    if (task.completedDate) {
      unmarkComplete(task.id, token)
    } else {
      markComplete(task.id, today, token)
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
              <div className="task-list">
                {pending.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    today={today}
                    onToggle={() => handleToggle(task)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <h2 className="h6 text-muted mb-2">Completed ({completed.length})</h2>
              <div className="task-list">
                {completed.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    today={today}
                    onToggle={() => handleToggle(task)}
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
  const titleColor = getReadableTextColor(task.backgroundColor)

  return (
    <div
      className="task-row"
      style={{ backgroundColor: task.backgroundColor ?? '#f8f9fa' }}
      data-testid={`task-row-${task.id}`}
    >
      <span
        className={'task-title' + (isDone ? ' completed' : '')}
        style={{ color: isDone ? '#6c757d' : titleColor }}
      >
        {task.title}
        {!task.synced && (
          <span className="task-offline-badge" title="Pending sync">●</span>
        )}
      </span>
      <span className="task-date">{task.startDate}</span>
      <button
        className={'task-toggle' + (isDone ? ' done' : '')}
        type="button"
        onClick={onToggle}
        aria-label={task.title + (isDone ? ' done' : ' pending')}
      >
        {isDone && '✓'}
      </button>
      <button
        className="task-delete-btn"
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        title="Delete"
        data-testid={`task-delete-${task.id}`}
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
