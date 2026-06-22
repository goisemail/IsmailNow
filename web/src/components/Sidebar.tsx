import { Link } from 'react-router-dom'
import './Sidebar.css'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const now = new Date()
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <>
      <div
        className={`sidebar-overlay${open ? ' open' : ''}`}
        onClick={onClose}
      />
      <div className={`sidebar-panel${open ? ' open' : ''}`}>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          ✕
        </button>

        <span className="sidebar-brand">Ismail Now</span>
        <span className="sidebar-date-title">{weekday}</span>
        <span className="sidebar-date-sub">{dateStr}</span>

        <div className="sidebar-divider" />

        <span className="sidebar-item">News and events</span>
        <span className="sidebar-item">Categories</span>
        <span className="sidebar-item">Timer</span>

        <div className="sidebar-divider" />

        <span className="sidebar-item">Customize</span>
        <Link to="/settings" className="sidebar-item" onClick={onClose}>
          Settings
        </Link>
        <span className="sidebar-item">Account and Backups</span>

        <div className="sidebar-divider" />

        <span className="sidebar-item">Premium</span>
        <span className="sidebar-item">Rate this app</span>
        <span className="sidebar-item">Contact us</span>
      </div>
    </>
  )
}
