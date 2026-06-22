import { Link, useLocation } from 'react-router-dom'
import { Home, BookOpen, CheckSquare, Calendar, Settings } from 'lucide-react'
import './Navigation.css'

export default function Navigation() {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light fixed-bottom border-top">
      <div className="container-fluid justify-content-around">
        <Link 
          to="/" 
          className={`nav-link nav-icon ${isActive('/') ? 'active' : ''}`}
          title="Home"
          data-testid="nav-home"
        >
          <Home size={24} />
          <span className="nav-label">Home</span>
        </Link>

        <Link 
          to="/history" 
          className={`nav-link nav-icon ${isActive('/history') ? 'active' : ''}`}
          title="History"
          data-testid="nav-history"
        >
          <Calendar size={24} />
          <span className="nav-label">History</span>
        </Link>

        <Link 
          to="/habit/new" 
          className={`nav-link nav-icon ${isActive('/habit/new') ? 'active' : ''}`}
          title="Add Habit"
          data-testid="nav-habits"
        >
          <BookOpen size={24} />
          <span className="nav-label">Habits</span>
        </Link>

        <Link 
          to="/history" 
          className={`nav-link nav-icon ${isActive('/tasks') ? 'active' : ''}`}
          title="Tasks"
          data-testid="nav-tasks"
        >
          <CheckSquare size={24} />
          <span className="nav-label">Tasks</span>
        </Link>

        <Link 
          to="/settings" 
          className={`nav-link nav-icon ${isActive('/settings') ? 'active' : ''}`}
          title="Settings"
          data-testid="nav-settings"
        >
          <Settings size={24} />
          <span className="nav-label">Settings</span>
        </Link>
      </div>
    </nav>
  )
}
