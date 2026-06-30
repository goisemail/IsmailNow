import { useEffect, useRef, useState } from 'react'
import { useTasksStore, PendingTask } from '../store/tasks'
import { useAuth } from '../contexts/AuthContext'
import { Trash2 } from 'lucide-react'
import { formatDate } from '../utils/date'
import { getReadableTextColor } from '../utils/color'
import TaskWizard from '../components/TaskWizard'
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

  const [taskWizardOpen, setTaskWizardOpen] = useState(false)
  const [visibleCompletedCount, setVisibleCompletedCount] = useState(3)
  const previousCompletedCount = useRef(0)

  const handleToggle = (task: PendingTask) => {
    if (task.completedDate) {
      unmarkComplete(task.id, token)
    } else {
      markComplete(task.id, today, token)
    }
  }

  const pending = tasks.filter((t) => !t.completedDate)
  const completed = tasks
    .filter((t) => !!t.completedDate)
    .sort((a, b) => {
      const completedDateOrder = (b.completedDate ?? '').localeCompare(a.completedDate ?? '')
      return completedDateOrder || b.createdAt.localeCompare(a.createdAt)
    })
  const completedToShow = completed.slice(0, visibleCompletedCount)
  const hasMoreCompleted = visibleCompletedCount < completed.length

  useEffect(() => {
    if (completed.length > previousCompletedCount.current) {
      setVisibleCompletedCount(3)
    }
    previousCompletedCount.current = completed.length
  }, [completed.length])

  const handleSaveTask = async (taskName: string) => {
    await addTask(taskName, today, token)
  }

  return (
    <div className="tasks-page container-lg py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Tasks</h1>
      </div>

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
                {completedToShow.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    today={today}
                    onToggle={() => handleToggle(task)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
              </div>
              <div className="completed-more-wrap">
                <button
                  type="button"
                  className="completed-more-btn"
                  onClick={() => setVisibleCompletedCount((prev) => prev + 3)}
                  disabled={!hasMoreCompleted}
                  aria-label="Show more completed tasks"
                >
                  ⬇
                </button>
              </div>
            </section>
          )}
        </>
      )}

      <button
        className="fab"
        type="button"
        onClick={() => setTaskWizardOpen(true)}
        aria-label="Add task"
        data-testid="add-task-fab"
      >
        +
      </button>

      <TaskWizard
        open={taskWizardOpen}
        onClose={() => setTaskWizardOpen(false)}
        onSave={handleSaveTask}
      />
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
