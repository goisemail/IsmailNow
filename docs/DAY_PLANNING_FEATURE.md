# Plan the Day Feature Analysis and Implementation Plan

This document analyzes the "plan the day" feature: tasks dated for a future day appear as a corresponding time block on the Planner calendar. It defines the data model, migration path, UI changes, and delivery order for the web app (the authoritative product per `README.md`).

## Current Baseline

The web application currently supports:

- Tasks stored as `PendingTask` with `startDate`, optional `completedDate`, soft delete, color, and Drive sync flag (`web/src/store/tasks.ts`).
- Rolling task visibility on Dashboard via `taskVisibleOnDate` (visible from `startDate` until the completion date).
- Task creation through a string-only `TaskWizard` (`onSave(taskName)`).
- A Planner page rendering tasks with React Big Calendar using fabricated times.
- A History page duplicating the same fabricated-time logic for tasks, plus habit events.
- Account-scoped `localStorage` persistence and Google Drive schema version 3 synchronization.

## Problem Statement

Tasks have no time or duration. Planner and History invent display times from task array order:

```ts
// web/src/pages/Planner.tsx:19-31 (duplicated in web/src/pages/History.tsx:54-64)
const start = new Date(`${task.startDate}T09:00:00`)
start.setHours(9 + (index % 8), 0, 0, 0)
const end = new Date(start)
end.setHours(start.getHours() + 1)
```

Consequences:

- Times are unstable; any reorder of `tasks` changes every block.
- The same task shows a different time after reload, filter, or merge.
- Users cannot express when they intend to work on a task.
- Creating a task from the Planner cannot place it in a chosen slot.

## Proposed Design

### Data model

Extend `PendingTask` (`web/src/store/tasks.ts:13-24`) with optional scheduling fields:

```ts
export interface PendingTask {
  id: string
  title: string
  backgroundColor?: string
  startDate: string
  scheduledStartAt?: string // RFC 3339, e.g. 2026-09-22T14:00:00.000Z
  scheduledEndAt?: string   // RFC 3339, strictly after scheduledStartAt
  scheduledTimeZone?: string // IANA zone, e.g. Asia/Kolkata
  createdAt: string
  updatedAt: string
  completedDate?: string
  isDeleted?: boolean
  deletedAt?: string
  synced: boolean
}
```

Rules:

- Both `scheduledStartAt` and `scheduledEndAt` present or both absent (unscheduled).
- `scheduledEndAt > scheduledStartAt`.
- `scheduledTimeZone` is the zone the user chose when scheduling; derive display with it, fall back to local zone if missing.
- No separate `CalendarBlock` entity for MVP; Planner events are derived from the task.
- Completion (`completedDate`) does not clear the schedule; the Planner block remains.
- Editing a past-date schedule is allowed; the block simply sits in the past (overdue).
- Overlaps: warn, do not reject (MVP).
- Duration: minimum 15 minutes, maximum 24 hours; cross-midnight allowed.
- Out of scope for MVP: recurrence, reminders/notifications, drag-resize as the only edit path (slot creation and a simple edit form are enough).

### Derived events (replace fabrication)

```ts
function taskToEvent(task: PendingTask): PlannerEvent | null {
  if (task.isDeleted) return null
  if (task.scheduledStartAt && task.scheduledEndAt) {
    return {
      id: task.id,
      title: task.title,
      start: new Date(task.scheduledStartAt),
      end: new Date(task.scheduledEndAt),
      backgroundColor: task.backgroundColor,
    }
  }
  return null // or an "unscheduled" gutter; MVP: omit from calendar
}
```

Planner (`web/src/pages/Planner.tsx`) and History (`web/src/pages/History.tsx`) both use this helper; delete the duplicated index-based fabrication.

### Visibility rule stays separate

`taskVisibleOnDate` (`web/src/store/tasks.ts:102-108`) is a rolling "what still belongs on this day" rule for Dashboard. Planner answers "when did I intend to work," keyed off `scheduledStartAt`. Do not merge the two semantics.

## Drive Schema Migration

- Bump `SCHEMA_VERSION` from 3 to 4 (`web/src/lib/googleDrive.ts:5`).
- Accept schema 2, 3, and 4 on read; schema 2/3 tasks parse without schedule fields (unscheduled).
- Add schedule fields to `parseTasks` (validate via RFC 3339 parse; invalid values become absent, not hard errors, for forward compatibility).
- Include `scheduledStartAt`, `scheduledEndAt`, `scheduledTimeZone` in `canonicalData()` (`web/src/lib/googleDrive.ts:332`) as nullable values so fingerprints stay stable.
- `mergeTasks` / `mergeTaskPair` already resolve by `updatedAt`; no change needed beyond `normalizeTask` not stripping new fields.
- No local `localStorage` key change; schema version lives in the Drive document only.

## UI Changes

### TaskWizard (`web/src/components/TaskWizard.tsx`)

- Replace `onSave(taskName: string)` with a structured draft: `{ title, startDate?, scheduledStartAt?, scheduledEndAt? }`.
- Add optional date, start time, and duration controls (collapsible "Schedule" section).
- Default `startDate` to the day the wizard was opened from (Dashboard selected date or Planner slot date).
- Update call sites: `Tasks.tsx`, `Dashboard.tsx` (and any QuickAdd path that opens TaskWizard).

### Planner (`web/src/pages/Planner.tsx`)

- Derive events from scheduled fields (helper above).
- Slot creation: on selectable slot, open TaskWizard prefilled with that day/time (duration default 1 hour).
- Event click: simple edit form (start, duration, title) writing back through a new store action `updateTaskSchedule(id, startAt, endAt)`.
- Unscheduled tasks: MVP omits them from the calendar; optional later "Unscheduled" side list.

### Tasks page (`web/src/pages/Tasks.tsx`)

- Group pending tasks: "Scheduled" (grouped by `startDate` day, ordered by `scheduledStartAt`) vs "Unscheduled".
- Show a compact time chip (`09:00–10:00`) on scheduled rows.

### Dashboard (`web/src/pages/Dashboard.tsx`)

- Show scheduled time on task rows when present (e.g. `09:00` before the title).
- Keep `taskVisibleOnDate` filtering unchanged.

### History (`web/src/pages/History.tsx`)

- Use the shared derived-events helper for tasks; leave habit event logic as-is.

## Bugs to Fix First

1. **UTC date-key bug** — `formatDate` (`web/src/utils/date.ts:5`) uses `toISOString().split('T')[0]`, which is the previous/next calendar day for users west/east of UTC. Add a local-date formatter (year-month-day from local getters) and use it everywhere date keys are produced (`getDateRange`, `isToday`, `formatDateDisplay` comparisons, `getWeekDays` in Dashboard if applicable).
2. **`nextDate` in History** (`web/src/pages/History.tsx:40-44`) uses `toISOString().slice(0, 10)` after local arithmetic; same class of bug.

## Store Actions to Add

In `web/src/store/tasks.ts`:

- `addTask` accepts optional schedule fields (or a new `addScheduledTask`).
- `updateTaskSchedule(id, startAt, endAt, timeZone?)`.
- `clearTaskSchedule(id)`.
- `setTaskStartDate(id, startDate)` if date editing is exposed outside the wizard.

All go through existing `updateLocal` so persistence and `synced: false` behavior stay consistent.

## Primary Files

- `web/src/store/tasks.ts` — model and actions.
- `web/src/store/tasks.test.ts` — schedule validation, merge, visibility tests.
- `web/src/lib/googleDrive.ts` — schema v4, parse, `canonicalData`.
- `web/src/lib/googleDrive.test.ts` — v2/v3 → unscheduled migration, v4 round-trip.
- `web/src/components/TaskWizard.tsx` + `web/src/components/TaskWizard.test.tsx` — structured draft.
- `web/src/pages/Planner.tsx` — derived events, slot create/edit.
- `web/src/pages/History.tsx` — shared derived events.
- `web/src/pages/Tasks.tsx` — grouping and time chips.
- `web/src/pages/Dashboard.tsx` — time display.
- `web/src/utils/date.ts` — local date-key helpers.

## Delivery Order

1. Local date utils fix (UTC date-key bug).
2. `PendingTask` schedule fields + store actions + unit tests.
3. Drive schema v4: parse, migrate v2/v3, `canonicalData`, tests.
4. TaskWizard structured draft; update Tasks/Dashboard call sites.
5. Planner + History derived events (delete fabrication).
6. Planner slot creation and schedule edit form.
7. Tasks grouping + Dashboard time display.
8. Responsive polish and full test pass.

## Acceptance Criteria

- A task scheduled for a future day appears in the Planner at the chosen start and end times, stably across reloads and Drive sync.
- Reordering or merging tasks does not change any task's displayed time.
- Users can create a task from a Planner slot and edit its time afterward.
- Existing v2/v3 Drive data loads as unscheduled tasks with no data loss.
- Overlaps show a warning; durations outside 15 min–24 h are rejected.
- Completing a scheduled task keeps the Planner block; unscheduled tasks never appear on the calendar.
- Local calendar dates match the user's timezone (date-key bug fixed).
- Dashboard rolling visibility behavior is unchanged.

## Validation Commands

Run from `web/` after each step:

```bash
npm run type-check
npm test -- --run
npm run lint
npm run build
```

Also run `git diff --check` from the repository root before committing.
