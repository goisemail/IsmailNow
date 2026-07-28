import { useState } from 'react'
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
  const syncWithDrive = useTasksStore((state) => state.syncWithDrive)
  const taskError = useTasksStore((state) => state.error)
  const habitError = useHabitsStore((state) => state.error)

  const {
    user,
    authError,
    reauthRequired,
    canSync,
    signIn,
    signOut,
    getAccessToken,
  } = useAuth()
  const isOnline = useOnlineStatus()

  // Set up periodic Drive flush, visibilitychange, and online-recovery flush
  useDriveSync()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()))
  const [weekOffset, setWeekOffset] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()

  const handleManualSync = async () => {
    if (!canSync) {
      alert('Cloud sync is available only when signed in with Google.')
      return
    }
    if (syncing) return

    setSyncing(true)
    try {
      await syncWithDrive(getAccessToken)
      alert('Cloud sync completed.')
      setSidebarOpen(false)
    } catch {
      alert('Cloud sync failed. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  const handleLogout = async () => {
    const signedOut = await signOut()
    if (!signedOut) return
    setSidebarOpen(false)
    navigate('/login', { replace: true })
  }

  const handleHeaderLogin = () => {
    if (user?.isGuest) {
      signIn()
      return
    }
    setSidebarOpen(false)
    navigate('/login')
  }

  return (
    <div className="app-wrapper">
      {/* Offline banner */}
      {!isOnline && (
        <div className="offline-banner" role="status">
          📵 Offline — task changes will sync when reconnected
        </div>
      )}
      {(authError || taskError || habitError || reauthRequired) && (
        <div className="offline-banner" role="alert">
          {authError ?? taskError ?? habitError ?? 'Cloud sync needs Google authorization.'}
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
        canSync={canSync}
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
