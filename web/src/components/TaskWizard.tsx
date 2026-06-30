import { useState, useRef, useEffect } from 'react'
import './TaskWizard.css'

interface TaskWizardProps {
  open: boolean
  onClose: () => void
  onSave: (taskName: string) => void | Promise<void>
  initialName?: string
  title?: string
  submitLabel?: string
}

export default function TaskWizard({
  open,
  onClose,
  onSave,
  initialName = '',
  title = 'Add Task',
  submitLabel = 'OK',
}: TaskWizardProps) {
  const [taskName, setTaskName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the input whenever the wizard opens
  useEffect(() => {
    if (open) {
      setTaskName(initialName)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, initialName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = taskName.trim()
    if (!trimmed) return
    await onSave(trimmed)
    setTaskName('')
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  if (!open) return null

  return (
    <div
      className="task-wizard-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-wizard-title"
    >
      <div className="task-wizard-card">
        <h2 className="task-wizard-title" id="task-wizard-title">
          {title}
        </h2>

        <form onSubmit={handleSubmit}>
          <label className="task-wizard-label" htmlFor="task-wizard-input">
            Task name
          </label>
          <input
            id="task-wizard-input"
            ref={inputRef}
            type="text"
            className="task-wizard-input"
            placeholder="e.g. Buy groceries"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            data-testid="taskWizardInput"
          />

          <div className="task-wizard-actions">
            <button
              type="button"
              className="task-wizard-btn task-wizard-btn--cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="task-wizard-btn task-wizard-btn--ok"
              disabled={!taskName.trim()}
              data-testid="taskWizardOk"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
