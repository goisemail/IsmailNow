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

  it('chains into the task wizard and links the created task', async () => {
    render(<PlanWizard open onClose={vi.fn()} defaultDate="2026-10-15" />)

    await userEvent.type(screen.getByTestId('planWizardName'), 'Gym session')
    await userEvent.click(screen.getByTestId('planWizardAddTask'))
    await userEvent.click(screen.getByTestId('planWizardSave'))

    expect(await screen.findByTestId('taskWizardInput')).toHaveValue('Gym session')
    await userEvent.click(screen.getByTestId('taskWizardOk'))

    await waitFor(() => {
      expect(usePlansStore.getState().plans[0].linkedTaskId).toBeTruthy()
    })
    const linkedTaskId = usePlansStore.getState().plans[0].linkedTaskId
    expect(useTasksStore.getState().tasks.map((task) => task.id)).toContain(linkedTaskId)
    expect(useTasksStore.getState().tasks[0]).toMatchObject({
      title: 'Gym session',
      startDate: '2026-10-15',
    })
  })

  it('keeps the plan when the chained task wizard is cancelled', async () => {
    render(<PlanWizard open onClose={vi.fn()} defaultDate="2026-10-15" />)

    await userEvent.type(screen.getByTestId('planWizardName'), 'Optional task')
    await userEvent.click(screen.getByTestId('planWizardAddTask'))
    await userEvent.click(screen.getByTestId('planWizardSave'))

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByTestId('taskWizardInput')).not.toBeInTheDocument())
    expect(usePlansStore.getState().plans).toHaveLength(1)
    expect(usePlansStore.getState().plans[0].linkedTaskId).toBeNull()
    expect(useTasksStore.getState().tasks).toHaveLength(0)
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

  it('chains into the task wizard first when both links are requested', async () => {
    render(<PlanWizard open onClose={vi.fn()} defaultDate="2026-10-15" />)

    await userEvent.type(screen.getByTestId('planWizardName'), 'Evening block')
    await userEvent.click(screen.getByTestId('planWizardAddTask'))
    await userEvent.click(screen.getByTestId('planWizardAddHabit'))
    await userEvent.click(screen.getByTestId('planWizardSave'))

    expect(await screen.findByTestId('taskWizardInput')).toHaveValue('Evening block')
    await userEvent.click(screen.getByTestId('taskWizardOk'))
    expect(await screen.findByTestId('habitWizardInput')).toBeInTheDocument()
  })
})
