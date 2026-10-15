import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import type { NavigateAction, View } from 'react-big-calendar'
import './PlannerToolbar.css'

const VIEW_LABELS: Record<string, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
}

interface PlannerToolbarProps {
  label: string
  view: View
  views: View[] | Record<string, unknown>
  onNavigate: (navigate: NavigateAction) => void
  onView: (view: View) => void
}

export default function PlannerToolbar({
  label,
  view,
  views,
  onNavigate,
  onView,
}: PlannerToolbarProps) {
  const enabledViews: View[] = Array.isArray(views)
    ? views
    : Object.entries(views)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name as View)

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const selectView = (name: View) => {
    onView(name)
    setMenuOpen(false)
  }

  return (
    <div className="planner-toolbar">
      <div className="planner-toolbar-left">
        <button
          type="button"
          className="planner-toolbar-today"
          onClick={() => onNavigate('TODAY')}
        >
          Today
        </button>
      </div>

      <div className="planner-toolbar-date-nav">
        <button
          type="button"
          className="planner-toolbar-nav-btn"
          onClick={() => onNavigate('PREV')}
          aria-label="Previous"
          data-testid="planner-prev"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="planner-toolbar-label">{label}</span>
        <button
          type="button"
          className="planner-toolbar-nav-btn"
          onClick={() => onNavigate('NEXT')}
          aria-label="Next"
          data-testid="planner-next"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="planner-toolbar-view" ref={menuRef}>
        <button
          type="button"
          className="planner-toolbar-view-btn"
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          data-testid="planner-view-menu"
        >
          {VIEW_LABELS[view] ?? view}
          <ChevronDown size={16} />
        </button>

        {menuOpen && (
          <div className="planner-toolbar-dropdown" role="menu">
            {enabledViews.map((name) => (
              <button
                key={name}
                type="button"
                role="menuitem"
                className={`planner-toolbar-dropdown-item${name === view ? ' active' : ''}`}
                onClick={() => selectView(name)}
                data-testid={`planner-view-${name}`}
              >
                {VIEW_LABELS[name] ?? name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
