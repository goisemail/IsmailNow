import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useHabitsStore } from '../store/habits'
import { ArrowLeft } from 'lucide-react'
import { habitColors } from '../theme/colors'

export default function HabitEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const habits = useHabitsStore((state) => state.habits)
  const addHabit = useHabitsStore((state) => state.addHabit)
  const updateHabit = useHabitsStore((state) => state.updateHabit)

  const habit = id ? habits.find((h) => h.id === id) : null
  const [name, setName] = useState(habit?.name || '')
  const [color, setColor] = useState(habit?.color || Object.values(habitColors)[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      if (habit) {
        updateHabit(habit.id, { name, color })
      } else {
        addHabit({ name, color })
      }
      navigate('/')
    }
  }

  return (
    <div className="container py-4">
      <button
        className="btn btn-outline-secondary btn-sm mb-3"
        onClick={() => navigate('/')}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <h1 className="h3 mb-4">{habit ? 'Edit Habit' : 'Create New Habit'}</h1>

      <form onSubmit={handleSubmit} className="card p-4">
        <div className="mb-3">
          <label htmlFor="habitName" className="form-label">
            Habit Name
          </label>
          <input
            id="habitName"
            type="text"
            className="form-control form-control-lg"
            placeholder="e.g., Morning Run"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
            data-testid="habitNameInput"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="habitColor" className="form-label">
            Color
          </label>
          <div className="d-flex gap-2 flex-wrap">
            {Object.entries(habitColors).map(([key, colorValue]) => (
              <button
                key={key}
                type="button"
                className={`btn ${
                  color === colorValue ? 'btn-light' : 'btn-outline-secondary'
                }`}
                style={{
                  width: '50px',
                  height: '50px',
                  backgroundColor: color === colorValue ? colorValue : 'transparent',
                  borderColor: colorValue,
                  borderWidth: '2px',
                }}
                onClick={() => setColor(colorValue)}
                data-testid={`habitColor-${key}`}
              ></button>
            ))}
          </div>
        </div>

        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary flex-grow-1">
            {habit ? 'Update Habit' : 'Create Habit'}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate('/')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
