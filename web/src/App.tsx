import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useHabitsStore } from './store/habits'
import { useTasksStore } from './store/tasks'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { useDriveSync } from './hooks/useDriveSync'
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
  const syncWithDrive = useTasksStore((state) => state.syncWithDrive)

  const { user, signOut } = useAuth()
  const isOnline = useOnlineStatus()

  // Set up periodic Drive flush, visibilitychange, and online-recovery flush
  useDriveSync()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()))
  const [weekOffset, setWeekOffset] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()

  // Load local data on mount
  useEffect(() => {
    loadHabits()
    loadTasks()
  }, [])

  const handleManualSync = async () => {
    if (!user?.accessToken) {
      alert('Cloud sync is available only when signed in with Google.')
      return
    }
    if (syncing) return

    setSyncing(true)
    try {
      await syncWithDrive(user.accessToken)
      alert('Cloud sync completed.')
      setSidebarOpen(false)
    } catch {
      alert('Cloud sync failed. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  const handleLogout = () => {
    signOut()
    setSidebarOpen(false)
    navigate('/login', { replace: true })
  }

  const handleHeaderLogin = () => {
    if (user?.isGuest) {
      signOut()
    }
    setSidebarOpen(false)
    navigate('/login')
  }

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
        {(!user || user.isGuest) && (
          <button
            className="app-header-login"
            type="button"
            onClick={handleHeaderLogin}
          >
            Log in
          </button>
        )}
        {user && !user.isGuest && user.photoUrl && (
          <img
            src={user.photoUrl}
            alt={user.name}
            className="app-header-avatar"
            title={user.email ? user.name + ' — ' + user.email : user.name}
          />
        )}
      </header>

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSyncToCloud={handleManualSync}
        onLogout={handleLogout}
        syncing={syncing}
        canSync={Boolean(user?.accessToken)}
        canLogout={Boolean(user)}
      />

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
