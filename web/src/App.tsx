import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useHabitsStore } from './store/habits'
import { useTasksStore } from './store/tasks'
import Navigation from './components/Navigation'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Habits from './pages/Habits'
import Tasks from './pages/Tasks'
import HabitEditor from './pages/HabitEditor'
import HabitDetails from './pages/HabitDetails'
import History from './pages/History'
import Planner from './pages/Planner'
import Settings from './pages/Settings'
import './App.css'

export default function App() {
  const loadHabits = useHabitsStore((state) => state.load)
  const loadTasks = useTasksStore((state) => state.load)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // Initialize stores from localStorage on app start
    loadHabits()
    loadTasks()
  }, [])

  return (
    <Router>
      <div className="app-wrapper">
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
        </header>

        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/habit/new" element={<HabitEditor />} />
            <Route path="/habit/:id" element={<HabitDetails />} />
            <Route path="/habit/:id/edit" element={<HabitEditor />} />
            <Route path="/history" element={<History />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
        <Navigation />
      </div>
    </Router>
  )
}
