# Planner Tab Redesign - Analysis (Fresh Start)

> Previous attempt was reverted. This document is a corrected rewrite, scoped strictly to the Planner tab. Two items from the old doc were invalid and are dropped: the date-fns locale error (already correct in code — `Planner.tsx:12-13` uses `locales = { 'en-US': enUS }`) and Timer → Task integration (no Timer feature exists in the app).

## Scope

- **In scope (Planner tab files):** `web/src/pages/Planner.tsx`, `web/src/pages/Planner.css`, new `web/src/pages/PlannerAddTaskModal.tsx` (+ `.css`)
- **Required dependency (minimal):** task time/repeat fields in `store/tasks.ts` and the whitelists in `lib/googleDrive.ts`. Without this, planned times/repeats are wiped on the next Drive sync. No other tabs change.

## Issues Identified

### 1. Theme Mismatch — DONE (step 1)
- **Problem**: Planner renders react-big-calendar's stock white chrome and default blue `#3174ad`; `Planner.css` contained only layout rules, no theme overrides. Header buttons use stock Bootstrap `btn-outline-secondary`.
- **Root cause**: No Planner-specific CSS integration with the app theme (`#F8F9FA` background, `#212529` text, `#E72372` primary) and no dark-mode handling, unlike other tabs.
- **Fix**: Theme overrides in `Planner.css` (see Phase 2) — implemented via CSS variables (`--planner-*`) on `.planner-page` with a `prefers-color-scheme: dark` token set, covering toolbar, grids, events, popover, and borders.

### 2. Duplicate Day/Week/Month Display — DONE (user decision)
- **Problem**:
  - Explicit button group in planner header (`Planner.tsx`)
  - react-big-calendar renders its own view toolbar at calendar top
  - Both show Day/Week/Month = duplicate UI, wastes vertical space
- **Fix (user decision)**: Keep one toolbar only — removed the header button group and replaced the RBC default toolbar with a custom `PlannerToolbar` (`components={{ toolbar }}`) in the reference style: `[Today] pill | < date label > ......... [Day][Week][Month]`. Label stays contextual per view (single date in Day, range in Week, month in Month).

### 3. No View Switcher After Toolbar Removal (gap in old plan) — RESOLVED
- **Problem**: The old plan removed the header button group AND set `toolbar={false}`, leaving the user with no way to switch Day/Week/Month.
- **Resolution**: Not applicable with the chosen approach — the RBC toolbar stays and provides both nav (Today/Back/Next) and the Day/Week/Month switcher.

### 4. Missing + Button for Daily Planning
- **Problem**: No add affordance in the Planner tab.
- **Fix**: FAB-style `+` button (same pattern as Tasks/Dashboard FABs) opening the planning modal.

### 5. Plan for Day Feature Requirements
The + button opens a modal with these fields:

| Field | Type | Description |
|-------|------|-------------|
| **Task Name** | Text input | Title of the task |
| **Start Time** | Time input (`HH:mm`) | When the task starts on the selected day |
| **End Time** | Time input (`HH:mm`) | Must be later than start time |
| **Day** | Date input | Which day the task applies to |
| **Repeats daily** | Checkbox + end date input | When checked, task repeats daily through the end date |
| **Status** | Active/Completed | Default active |

### 6. Fake Event Times in Calendar Mapping
- **Problem**: `Planner.tsx:24-27` fabricates times (`9 + index % 8`) instead of using real task times, so events are plotted at meaningless positions.
- **Fix**: Combine `startDate` + `startTime`/`endTime` into real event start/end.

### 7. No Recurrence Expansion
- **Problem**: react-big-calendar has no recurrence. A repeating task (repeat end date) exists as a single record but must appear on every day in its range.
- **Fix**: Expand repeating tasks into per-day events using date-fns (e.g. `eachDayOfInterval` between `startDate` and `endDate`) when building `plannerEvents`.

### 8. Events Ignore Task Colors and Completed State
- **Problem**: Events render plain; tasks already have `backgroundColor` in the store and a `completedDate` field that is unused in the calendar.
- **Fix**: Pass per-event styling from `task.backgroundColor`; visually differentiate completed tasks.

### 9. Redundant Calendar Props
- **Problem**: `Planner.tsx:74-75` passes both `defaultView` and controlled `view` — redundant and triggers a react-big-calendar warning.
- **Fix**: Use controlled `view` + `onView` only.

### 10. No Tests
- **Problem**: No test coverage exists for the planner event mapping, recurrence expansion, modal validation, or the new task fields.
- **Fix**: Colocated vitest tests (see Phase 5).

## Development Plan

### Phase 1: Planner.tsx
1. ~~Set `toolbar={false}` on `BigCalendar`~~ — not needed
2. ~~Build custom planner header~~ — removed header button group; toolbar consolidated into one
3. Added custom `components/PlannerToolbar.tsx`: `Today` outline pill + adjacent `ChevronLeft`/`ChevronRight` (lucide-react) + contextual date label on the left, `Day/Week/Month` segmented control right-aligned; removed the redundant `defaultView` prop
4. Replace fake-time event mapping: real start/end from stored times, keyed per day
5. Expand repeating tasks across their date range (`eachDayOfInterval`)
6. Attach `task.backgroundColor` and completed styling to events
7. Add FAB `+` button that opens the planning modal

### Phase 2: Planner.css
1. Theme colors matching App.css:
   - `.planner-page` background: `#F8F9FA`, text `#212529`
   - Header nav/view buttons: primary `#E72372`, secondary `#6C757D`
2. Override react-big-calendar defaults (`.rbc-*`) with the app palette — headers, toolbars, today highlight, event backgrounds, borders
3. Dark-mode support via `@media (prefers-color-scheme: dark)` matching the rest of the app
4. Layout for the new custom header and the FAB
5. Keep existing flex/height layout working with the smaller header

### Phase 3: Planning Modal Component (PlannerAddTaskModal.tsx)
Create new component with:
- Form: task name, start time, end time, day, repeat toggle + repeat end date
- Validation: name required, end time after start time, repeat end date not before day
- On save: call extended `addTask` with time/repeat info
- Close on cancel / overlay click / Escape
- Styling matching app theme (reuse modal pattern from `TaskWizard.tsx`)

### Phase 4: Tasks Store + Drive Sync Extension
Update `PendingTask` interface with:
- `startTime?: string` (`HH:mm`)
- `endTime?: string` (`HH:mm`)
- `endDate?: string | null`
- `isRepeating?: boolean`

Update `addTask` signature (backward compatible — optional params):
```typescript
addTask: (title: string, startDate: string, options?: { startTime?: string; endTime?: string; endDate?: string | null; isRepeating?: boolean }) => Promise<void>
```

**Critical** — also update `lib/googleDrive.ts`, otherwise new fields are silently dropped:
- `parseTasks` (lines 171-182): whitelist-rebuilds tasks from Drive — add the four new fields or they vanish on every load
- `canonicalData` (lines 336-346): conflict fingerprint whitelist — add the four fields or time-only edits look identical and cause lost updates / skipped writes

Existing callers (`Dashboard.tsx`, `Tasks.tsx`) keep working unchanged via optional params.

### Phase 5: Testing
Colocated vitest tests following repo conventions:
- `Planner` event mapping: real times used, no fabricated positions
- Recurrence expansion: one repeating task → one event per day in range
- Store: `addTask` persists new fields; tasks without times still work
- `googleDrive`: `parseTasks` / `canonicalData` round-trip the four new fields
- Modal validation: end time > start time; repeat end date >= day

## Verification Checklist
- [ ] Theme matches other tabs (light + dark)
- [ ] Single Day/Week/Month switcher; nav buttons work
- [ ] + button opens modal with all fields
- [ ] Saved task appears at its real time on the calendar
- [ ] Repeating task appears on every day through its end date
- [ ] Times/repeats survive reload and Drive sync on a second device
- [ ] No TypeScript errors / lint errors; `npm test` passes
