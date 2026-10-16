import eachDayOfInterval from 'date-fns/eachDayOfInterval'
import format from 'date-fns/format'
import type { PendingPlan } from '../store/plans'

export interface PlannerEvent {
  id: string
  title: string
  start: Date
  end: Date
  linkedTask: boolean
  linkedHabit: boolean
}

export function planOccurrenceDates(plan: PendingPlan): string[] {
  if (!plan.isRepeating) return [plan.startDate]
  const end = plan.endDate && plan.endDate > plan.startDate ? plan.endDate : plan.startDate
  const dateKeys = eachDayOfInterval({
    start: new Date(`${plan.startDate}T00:00:00`),
    end: new Date(`${end}T00:00:00`),
  }).map((day) => format(day, 'yyyy-MM-dd'))

  const repeatDays = plan.repeatDays && plan.repeatDays.length > 0 ? plan.repeatDays : null
  if (!repeatDays) return dateKeys

  const [firstDay, ...remainingDays] = dateKeys
  return [
    firstDay,
    ...remainingDays.filter((key) => repeatDays.includes(new Date(`${key}T00:00:00`).getDay())),
  ]
}

export function buildEvent(plan: PendingPlan, dateKey: string): PlannerEvent {
  const [startHour, startMinute] = plan.startTime.split(':').map(Number)
  const [endHour, endMinute] = plan.endTime.split(':').map(Number)
  const start = new Date(`${dateKey}T00:00:00`)
  start.setHours(startHour, startMinute, 0, 0)
  const end = new Date(start)
  end.setHours(endHour, endMinute, 0, 0)
  return {
    id: `${plan.id}:${dateKey}`,
    title: plan.title,
    start,
    end,
    linkedTask: Boolean(plan.linkedTaskId),
    linkedHabit: Boolean(plan.linkedHabitId),
  }
}
