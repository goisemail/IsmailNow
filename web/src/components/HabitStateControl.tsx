import { Check, Circle, Minus, MoreHorizontal, X } from 'lucide-react'
import type { HabitDisplayState } from '../store/habits'
import './HabitState.css'

interface HabitStateControlProps {
  state: HabitDisplayState
  label: string
  onClick: () => void
  disabled?: boolean
  testId?: string
}

export default function HabitStateControl({ state, label, onClick, disabled, testId }: HabitStateControlProps) {
  const icon = state === 'completed'
    ? <Check size={20} />
    : state === 'failed' || state === 'missed'
      ? <X size={20} />
      : state === 'skipped'
        ? <Minus size={20} />
        : state === 'inProgress'
          ? <MoreHorizontal size={20} />
          : <Circle size={18} />

  return (
    <button
      type="button"
      className={`habit-state-control habit-state-control--${state}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      data-testid={testId}
    >
      {icon}
    </button>
  )
}
