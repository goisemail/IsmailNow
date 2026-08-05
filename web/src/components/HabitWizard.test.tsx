import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import HabitWizard from './HabitWizard'

describe('HabitWizard', () => {
  it('submits the habit from a modal without navigation', async () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<HabitWizard open onClose={onClose} onSave={onSave} />)

    await userEvent.type(screen.getByTestId('habitWizardInput'), 'Morning walk')
    await userEvent.click(screen.getByLabelText('Use colour #198754'))
    for (let step = 0; step < 5; step += 1) {
      await userEvent.click(screen.getByTestId('habitWizardOk'))
    }

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Morning walk',
      color: '#198754',
      evaluation: { type: 'binary' },
      schedule: { type: 'everyDay' },
    }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('loads existing values for editing', () => {
    render(
      <HabitWizard
        open
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialHabit={{
          id: 'habit-1',
          name: 'Read',
          color: '#0D6EFD',
          category: 'Study',
          priority: 0,
          evaluation: { type: 'binary' },
          schedule: { type: 'everyDay' },
          startDate: '2026-07-29',
          createdAt: '2026-07-29T00:00:00.000Z',
          updatedAt: '2026-07-29T00:00:00.000Z',
          synced: true,
        }}
        title="Edit Habit"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Edit Habit' })).toBeInTheDocument()
    expect(screen.getByTestId('habitWizardInput')).toHaveValue('Read')
    expect(screen.getByLabelText('Use colour #0D6EFD')).toHaveClass('selected')
  })
})
