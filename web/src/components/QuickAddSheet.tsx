import { Trophy, Repeat, Check, ChevronRight, X } from 'lucide-react'
import './QuickAddSheet.css'

interface QuickAddItem {
  id: 'habit' | 'task' | 'priority'
  title: string
  subtitle: string
  icon: React.ReactNode
}

interface QuickAddSheetProps {
  open: boolean
  onClose: () => void
  onSelectHabit: () => void
  onSelectTask: () => void
  onSelectPriority: () => void
}

const QUICK_ADD_ITEMS: QuickAddItem[] = [
  {
    id: 'habit',
    title: 'Habit',
    subtitle: 'Activity that repeats over time. Track and build streaks.',
    icon: <Trophy size={20} color="#E72372" strokeWidth={2} />,
  },
  {
    id: 'task',
    title: 'Task',
    subtitle: 'Activity that repeats over time without detailed tracking.',
    icon: <Repeat size={20} color="#E72372" strokeWidth={2} />,
  },
  {
    id: 'priority',
    title: 'Priority',
    subtitle: 'Single instance activity without recurring tracking.',
    icon: <Check size={20} color="#E72372" strokeWidth={2} />,
  },
]

export default function QuickAddSheet({
  open,
  onClose,
  onSelectHabit,
  onSelectTask,
  onSelectPriority,
}: QuickAddSheetProps) {
  const handleSelect = (id: string) => {
    if (id === 'habit') onSelectHabit()
    else if (id === 'task') onSelectTask()
    else if (id === 'priority') onSelectPriority()
  }

  return (
    <>
      {open && (
        <div className="quick-add-overlay" onClick={onClose}>
          <div className="quick-add-backdrop" />
        </div>
      )}

      <div className={`quick-add-sheet ${open ? 'open' : ''}`}>
        <div className="quick-add-header">
          <h2 className="quick-add-title">Quick Add</h2>
          <button
            className="quick-add-close"
            onClick={onClose}
            aria-label="Close quick add"
            data-testid="quickAddClose"
          >
            <X size={24} color="#6c757d" />
          </button>
        </div>

        <div className="quick-add-items">
          {QUICK_ADD_ITEMS.map((item) => (
            <button
              key={item.id}
              className="quick-add-item"
              onClick={() => {
                handleSelect(item.id)
                onClose()
              }}
              data-testid={`quickAdd-${item.id}`}
            >
              <div className="quick-add-icon-wrap">{item.icon}</div>
              <div className="quick-add-text">
                <div className="quick-add-item-title">{item.title}</div>
                <div className="quick-add-item-subtitle">{item.subtitle}</div>
              </div>
              <ChevronRight size={20} color="#8a8e99" strokeWidth={2} />
            </button>
          ))}
        </div>
      </div>

      {open && (
        <button className="fab" onClick={onClose} data-testid="fab">
          <span className="fab-icon">+</span>
        </button>
      )}
    </>
  )
}
