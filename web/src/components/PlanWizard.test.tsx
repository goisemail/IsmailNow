import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PlanWizard from './PlanWizard'
import { useHabitsStore } from '../store/habits'
import { usePlansStore } from '../store/plans'
import { useTasksStore } from '../store/tasks'

function loadStores(): void {
  useTasksStore.getState().clearMemory()
  useHabitsStore.getState().clearMemory()
  usePlansStore.getState().clearMemory()
  useTasksStore.getState().load('guest:local')
  void useHabitsStore.getState().load('guest:local')
  usePlansStore.getState().load('guest:local')
}

describe('PlanWizard', () => {
  beforeEach(() => {
    localStorage.clear()
    loadStores()
  })

  it('saves a plan with the entered times', async () => {
    const onClose = vi.fn()
    render(<PlanWizard open onClose={onClose} defaultDate="2026-10-15" />)

    await userEvent.type(screen.getByTestId('planWizardName'), 'Deep work')
    fireEvent.change(screen.getByTestId('planWizardStart'), { target: { value: '13:00' } })
    fireEvent.change(screen.getByTestId('planWizardEnd'), { target: { value: '15:00' } })
    await userEvent.click(screen.getByTestId('planWizardSave'))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    const plans = usePlansStore.getState().plans
    expect(plans).toHaveLength(1)
    expect(plans[0]).toMatchObject({
      title: 'Deep work',
      startDate: '2026-10-15',
      startTime: '13:00',
      endTime: '15:00',
      isRepeating: false,
    })
  })

  it('rejects an end time that is not after the start time', async () => {
    render(<PlanWizard open onClose={vi.fn()} defaultDate="2026-10-15" />)

    await userEvent.type(screen.getByTestId('planWizardName'), 'Bad range')
    fireEvent.change(screen.getByTestId('planWizardStart'), { target: { value: '15:00' } })
    fireEvent.change(screen.getByTestId('planWizardEnd'), { target: { value: '14:00' } })
    await userEvent.click(screen.getByTestId('planWizardSave'))

    expect(screen.getByText('End time must be after the start time.')).toBeInTheDocument()
    expect(usePlansStore.getState().plans).toHaveLength(0)
  })

  it('requires a repeat end date on or after the day', async () => {
    render(<PlanWizard open onClose={vi.fn()} defaultDate="2026-10-15" />)

    await userEvent.type(screen.getByTestId('planWizardName'), 'Standup')
    await userEvent.click(screen.getByTestId('planWizardRepeat'))
    fireEvent.change(screen.getByTestId('planWizardRepeatEnd'), { target: { value: '2026-10-14' } })
    await userEvent.click(screen.getByTestId('planWizardSave'))

    expect(screen.getByText('Repeat end date must be on or after the day.')).toBeInTheDocument()
    expect(usePlansStore.getState().plans).toHaveLength(0)
  })

  it('marks every weekday by default and stores only the selected days', async () => {
    const onClose = vi.fn()
    render(<PlanWizard open onClose={onClose} defaultDate="2026-10-16" />)

    await userEvent.type(screen.getByTestId('planWizardName'), 'Weekend gym')
    await userEvent.click(screen.getByTestId('planWizardRepeat'))

    for (const day of [0, 1, 2, 3, 4, 5, 6]) {
      expect(screen.getByTestId(`planWizardDay-${day}`)).toHaveAttribute('aria-pressed', 'true')
    }

    for (const day of [1, 2, 3, 4, 5]) {
      await userEvent.click(screen.getByTestId(`planWizardDay-${day}`))
    }
    fireEvent.change(screen.getByTestId('planWizardRepeatEnd'), { target: { value: '2026-10-30' } })
    await userEvent.click(screen.getByTestId('planWizardSave'))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(usePlansStore.getState().plans[0]).toMatchObject({
      title: 'Weekend gym',
      isRepeating: true,
      repeatDays: [0, 6],
      endDate: '2026-10-30',
    })
  })

  it('creates a linked task instantly when the task checkbox is ticked', async () => {
    const onClose = vi.fn()
    render(<PlanWizard open onClose={onClose} defaultDate="2026-10-15" />)

    await userEvent.type(screen.getByTestId('planWizardName'), 'Gym session')
    await userEvent.click(screen.getByTestId('planWizardAddTask'))
    await userEvent.click(screen.getByTestId('planWizardSave'))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    const plans = usePlansStore.getState().plans
    const tasks = useTasksStore.getState().tasks
    expect(plans).toHaveLength(1)
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({ title: 'Gym session', startDate: '2026-10-15' })
    expect(plans[0].linkedTaskIds).toEqual([tasks[0].id])
    expect(screen.queryByTestId('taskWizardInput')).not.toBeInTheDocument()
  })

  it('creates one task per selected weekday, skipping the creation day', async () => {
    const onClose = vi.fn()
    render(<PlanWizard open onClose={onClose} defaultDate="2026-10-15" />)

    await userEvent.type(screen.getByTestId('planWizardName'), 'Monday Friday block')
    await userEvent.click(screen.getByTestId('planWizardAddTask'))
    await userEvent.click(screen.getByTestId('planWizardRepeat'))
    for (const day of [0, 2, 3, 4, 6]) {
      await userEvent.click(screen.getByTestId(`planWizardDay-${day}`))
    }
    fireEvent.change(screen.getByTestId('planWizardRepeatEnd'), { target: { value: '2026-10-31' } })
    await userEvent.click(screen.getByTestId('planWizardSave'))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    const taskDates = useTasksStore.getState().tasks.map((task) => task.startDate)
    expect(taskDates).toEqual(['2026-10-16', '2026-10-19', '2026-10-23', '2026-10-26', '2026-10-30'])
    expect(useTasksStore.getState().tasks.every((task) => task.title === 'Monday Friday block')).toBe(true)
    expect(usePlansStore.getState().plans[0].linkedTaskIds).toEqual(
      useTasksStore.getState().tasks.map((task) => task.id),
    )
  })

  it('keeps the plan and task when the chained habit wizard is cancelled', async () => {
    render(<PlanWizard open onClose={vi.fn()} defaultDate="2026-10-15" />)

    await userEvent.type(screen.getByTestId('planWizardName'), 'Evening block')
    await userEvent.click(screen.getByTestId('planWizardAddTask'))
    await userEvent.click(screen.getByTestId('planWizardAddHabit'))
    await userEvent.click(screen.getByTestId('planWizardSave'))

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByTestId('habitWizardInput')).not.toBeInTheDocument())
    expect(usePlansStore.getState().plans).toHaveLength(1)
    expect(useTasksStore.getState().tasks).toHaveLength(1)
    expect(useHabitsStore.getState().habits).toHaveLength(0)
    expect(usePlansStore.getState().plans[0].linkedHabitId).toBeNull()
  })

  it('chains into the habit wizard and links the created habit', async () => {
    render(<PlanWizard open onClose={vi.fn()} defaultDate="2026-10-15" />)

    await userEvent.type(screen.getByTestId('planWizardName'), 'Morning run')
    await userEvent.click(screen.getByTestId('planWizardAddHabit'))
    await userEvent.click(screen.getByTestId('planWizardSave'))

    await userEvent.type(await screen.findByTestId('habitWizardInput'), 'Morning run')
    for (let step = 0; step < 5; step += 1) {
      await userEvent.click(screen.getByTestId('habitWizardOk'))
    }

    await waitFor(() => {
      expect(usePlansStore.getState().plans[0].linkedHabitId).toBeTruthy()
    })
    const linkedHabitId = usePlansStore.getState().plans[0].linkedHabitId
    expect(useHabitsStore.getState().habits.map((habit) => habit.id)).toContain(linkedHabitId)
  })

  it('creates the task instantly and opens only the habit wizard when both are ticked', async () => {
    render(<PlanWizard open onClose={vi.fn()} defaultDate="2026-10-15" />)

    await userEvent.type(screen.getByTestId('planWizardName'), 'Evening block')
    await userEvent.click(screen.getByTestId('planWizardAddTask'))
    await userEvent.click(screen.getByTestId('planWizardAddHabit'))
    await userEvent.click(screen.getByTestId('planWizardSave'))

    expect(await screen.findByTestId('habitWizardInput')).toBeInTheDocument()
    expect(useTasksStore.getState().tasks.map((task) => task.title)).toEqual(['Evening block'])
    expect(screen.queryByTestId('taskWizardInput')).not.toBeInTheDocument()
  })

  it('prefills the wizard from an existing plan', async () => {
    const id = usePlansStore.getState().addPlan({
      title: 'Morning walk',
      startDate: '2026-10-16',
      startTime: '09:00',
      endTime: '10:00',
      isRepeating: true,
      repeatDays: [1, 5],
      endDate: '2026-10-31',
    })

    render(<PlanWizard open onClose={vi.fn()} defaultDate="2026-10-15" planToEdit={usePlansStore.getState().plans.find((p) => p.id === id)!} />)

    expect(screen.getByTestId('planWizardName')).toHaveValue('Morning walk')
    expect(screen.getByTestId('planWizardDay')).toHaveValue('2026-10-16')
    expect(screen.getByTestId('planWizardStart')).toHaveValue('09:00')
    expect(screen.getByTestId('planWizardEnd')).toHaveValue('10:00')
    expect(screen.getByTestId('planWizardRepeat')).toBeChecked()
    expect(screen.getByTestId('planWizardDay-1')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('planWizardDay-5')).toHaveAttribute('aria-pressed', 'true')
  })

  it('updates an existing plan when saved from edit mode', async () => {
    const id = usePlansStore.getState().addPlan({
      title: 'Morning walk',
      startDate: '2026-10-16',
      startTime: '09:00',
      endTime: '10:00',
    })

    render(<PlanWizard open onClose={vi.fn()} defaultDate="2026-10-15" planToEdit={usePlansStore.getState().plans.find((p) => p.id === id)!} />)

    await userEvent.clear(screen.getByTestId('planWizardName'))
    await userEvent.type(screen.getByTestId('planWizardName'), 'Evening walk')
    fireEvent.change(screen.getByTestId('planWizardStart'), { target: { value: '18:00' } })
    fireEvent.change(screen.getByTestId('planWizardEnd'), { target: { value: '19:00' } })
    await userEvent.click(screen.getByTestId('planWizardSave'))

    await waitFor(() => expect(usePlansStore.getState().plans[0].title).toBe('Evening walk'))
    expect(usePlansStore.getState().plans[0].startTime).toBe('18:00')
    expect(usePlansStore.getState().plans[0].synced).toBe(false)
  })

  it('deletes a plan from edit mode', async () => {
    const id = usePlansStore.getState().addPlan({
      title: 'To delete',
      startDate: '2026-10-16',
      startTime: '09:00',
      endTime: '10:00',
    })

    render(<PlanWizard open onClose={vi.fn()} defaultDate="2026-10-15" planToEdit={usePlansStore.getState().plans.find((p) => p.id === id)!} />)

    await userEvent.click(screen.getByTestId('planWizardDelete'))
    const plans = usePlansStore.getState().plans
    expect(plans).toHaveLength(1)
    expect(plans[0].isDeleted).toBe(true)
    expect(plans[0].synced).toBe(false)
  })
})
