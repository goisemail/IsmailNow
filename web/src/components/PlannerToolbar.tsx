import { ChevronLeft, ChevronRight } from 'lucide-react'
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
        <div className="planner-toolbar-nav">
          <button
            type="button"
            className="planner-toolbar-nav-btn"
            onClick={() => onNavigate('PREV')}
            aria-label="Previous"
            data-testid="planner-prev"
          >
            <ChevronLeft size={20} />
          </button>
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
        <span className="planner-toolbar-label">{label}</span>
      </div>

      <div className="planner-toolbar-views" role="group" aria-label="Planner view">
        {enabledViews.map((name) => (
          <button
            key={name}
            type="button"
            className={`planner-toolbar-view-btn${name === view ? ' active' : ''}`}
            onClick={() => onView(name)}
            aria-pressed={name === view}
            data-testid={`planner-view-${name}`}
          >
            {VIEW_LABELS[name] ?? name}
          </button>
        ))}
      </div>
    </div>
  )
}
