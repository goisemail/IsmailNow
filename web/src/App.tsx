import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useHabitsStore } from './store/habits'
import { useTasksStore } from './store/tasks'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import Navigation from './components/Navigation'
import Sidebar from './components/Sidebar'
import Dashboard, { DashboardWeekNavigator } from './pages/Dashboard'
import Habits from './pages/Habits'
import Tasks from './pages/Tasks'
import HabitEditor from './pages/HabitEditor'
import HabitDetails from './pages/HabitDetails'
import History from './pages/History'
import Planner from './pages/Planner'
import Settings from './pages/Settings'
import Login from './pages/Login'
import { formatDate } from './utils/date'
import './App.css'

// ─── Protected route wrapper ──────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

// ─── App shell ────────────────────────────────────────────────────────────────

function AppContent() {
  const loadHabits = useHabitsStore((state) => state.load)
  const loadTasks = useTasksStore((state) => state.load)
  const syncPending = useTasksStore((state) => state.syncPending)

  const { user } = useAuth()
  const isOnline = useOnlineStatus()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()))
  const [weekOffset, setWeekOffset] = useState(0)
  const location = useLocation()

  // Load local data on mount
  useEffect(() => {
    loadHabits()
    loadTasks()
  }, [])

  // Auto-sync the offline queue whenever the network comes back online
  useEffect(() => {
    if (isOnline && user?.accessToken) {
      syncPending(user.accessToken).catch(console.error)
    }
  }, [isOnline, user?.accessToken])

  return (
    <div className="app-wrapper">
      {/* Offline banner */}
      {!isOnline && (
        <div className="offline-banner" role="status">
          📵 Offline — changes will sync when reconnected
        </div>
      )}

      <header className="app-header">
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          data-testid="hamburger-btn"
        >
          &#9776;
        </button>
        <span className="app-header-title">Ismail Now</span>
        {user && (
          <img
            src={user.photoUrl}
            alt={user.name}
            className="app-header-avatar"
            title={user.name + ' — ' + user.email}
          />
        )}
      </header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {location.pathname === '/' && (
        <DashboardWeekNavigator
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          weekOffset={weekOffset}
          setWeekOffset={setWeekOffset}
        />
      )}

      <div className="page-content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Dashboard selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
              </RequireAuth>
            }
          />
          <Route path="/habits" element={<RequireAuth><Habits /></RequireAuth>} />
          <Route path="/tasks" element={<RequireAuth><Tasks /></RequireAuth>} />
          <Route path="/habit/new" element={<RequireAuth><HabitEditor /></RequireAuth>} />
          <Route path="/habit/:id" element={<RequireAuth><HabitDetails /></RequireAuth>} />
          <Route path="/habit/:id/edit" element={<RequireAuth><HabitEditor /></RequireAuth>} />
          <Route path="/history" element={<RequireAuth><History /></RequireAuth>} />
          <Route path="/planner" element={<RequireAuth><Planner /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        </Routes>
      </div>
      <Navigation />
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  )
}
