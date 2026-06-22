import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useHabitsStore } from './store/habits'
import { useTasksStore } from './store/tasks'
import Navigation from './components/Navigation'
import Dashboard from './pages/Dashboard'
import HabitEditor from './pages/HabitEditor'
import HabitDetails from './pages/HabitDetails'
import History from './pages/History'
import Settings from './pages/Settings'
import './App.css'

export default function App() {
  const loadHabits = useHabitsStore((state) => state.load)
  const loadTasks = useTasksStore((state) => state.load)

  useEffect(() => {
    // Initialize stores from localStorage on app start
    loadHabits()
    loadTasks()
  }, [])

  return (
    <Router>
      <div className="app-wrapper">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/habit/new" element={<HabitEditor />} />
          <Route path="/habit/:id" element={<HabitDetails />} />
          <Route path="/habit/:id/edit" element={<HabitEditor />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        <Navigation />
      </div>
    </Router>
  )
}
