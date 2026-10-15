# Planner Tab Redesign - Analysis (Fresh Start)

> Previous attempt was reverted. This document is a corrected rewrite, scoped strictly to the Planner tab. Two items from the old doc were invalid and are dropped: the date-fns locale error (already correct in code — `Planner.tsx:12-13` uses `locales = { 'en-US': enUS }`) and Timer → Task integration (no Timer feature exists in the app).

## Scope

- **In scope (Planner tab files):** `web/src/pages/Planner.tsx`, `web/src/pages/Planner.css`, `web/src/components/PlannerToolbar.tsx` (+ `.css`), new `web/src/components/PlanWizard.tsx` (+ `.css`), new `web/src/store/plans.ts`
- **Required dependency:** plan persistence in `lib/googleDrive.ts` (parse + canonical whitelists, schema bump). Without it, plans are wiped on the next Drive sync.
- **Reused unchanged:** `TaskWizard`, `HabitWizard`, `addTask`, `addHabit` — chained from the plan flow. Tasks/Habits/Home tabs read the same stores, so linked tasks/habits appear there automatically.
- A plan exists **independently** of tasks/habits (both checkboxes optional), so it is its own entity — not extended task fields.

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
- **Fix (user decision)**: Keep one toolbar only — removed the header button group and replaced the RBC default toolbar with a custom `PlannerToolbar` (`components={{ toolbar }}`) in the reference style: `[Today] pill | < date label >` on the left, view selector dropdown (`Day ▾` pill opening a Day/Week/Month menu) on the right. Label stays contextual per view (single date in Day, range in Week, month in Month).

### 3. No View Switcher After Toolbar Removal (gap in old plan) — RESOLVED
- **Problem**: The old plan removed the header button group AND set `toolbar={false}`, leaving the user with no way to switch Day/Week/Month.
- **Resolution**: Not applicable with the chosen approach — the RBC toolbar stays and provides both nav (Today/Back/Next) and the Day/Week/Month switcher.

### 4. Missing + Button for Daily Planning — SPEC APPROVED (step 4)
- **Problem**: No add affordance in the Planner tab.
- **Fix**: FAB-style `+` button reusing the shared `.fab` class (identical to Home/Tasks: fixed, orange, above bottom nav — no new CSS) opening a new **PlanWizard** modal.

### 5. Plan for Day Feature Requirements — SPEC APPROVED (step 4)

The + button opens **PlanWizard** with these fields:

| Field | Type | Description |
|-------|------|-------------|
| **Planner name** | Text input | Title of the plan block |
| **Start Time** | Time input (`HH:mm`) | When the block starts on the selected day |
| **End Time** | Time input (`HH:mm`) | Must be later than start time |
| **Day** | Date input | Which day the plan applies to |
| **Repeats daily** | Checkbox + end date input | When checked, the plan repeats daily through the end date |
| **Also add as Task** | Checkbox | On save, chains `TaskWizard` (prefilled with plan name); task lands in Tasks tab + Home |
| **Also add as Habit** | Checkbox | On save, chains `HabitWizard` (name/color/evaluation/frequency/priority…); habit lands in Habits tab + Home |

**Approved flow:**
1. Save → the plan is created immediately (always; checkboxes optional — a plan can exist alone)
2. If **Task** checked → `TaskWizard` opens (`initialName` = plan name) → save calls existing `addTask(name, day)`
3. If **Habit** checked → `HabitWizard` opens → save calls existing `addHabit(draft)` (after the task wizard when both are checked)
4. Chaining order when both checked: **Task → Habit**
5. Cancelling a chained wizard keeps the plan and skips that link (no task/habit created)
6. Plan edit/delete deferred to a later step

**Purpose (user mental model):** the calendar shows allocated time blocks — "in this hour I do this task / this habit" — prepared ahead of the day.

### 6. Fake Event Times in Calendar Mapping
- **Problem**: `Planner.tsx:24-27` fabricates times (`9 + index % 8`) instead of using real times, so events are plotted at meaningless positions.
- **Fix**: Map **plans** (not tasks) to events: combine `startDate` + `startTime`/`endTime` into real event start/end.

### 7. No Recurrence Expansion
- **Problem**: react-big-calendar has no recurrence. A repeating plan (repeat end date) exists as a single record but must appear on every day in its range.
- **Fix**: Expand repeating plans into per-day events using date-fns (`eachDayOfInterval` between `startDate` and `endDate`) when building `plannerEvents`.

### 8. Events Ignore Plan Styling and State
- **Problem**: Events render plain; plans have no distinct color/state, and linked vs standalone plans are indistinguishable.
- **Fix (approved)**: Plans are the only calendar content (tasks/habits live in their tabs; Tasks-tab tasks have no times and would clutter the grid). Per-event styling for plans with a plan palette; visual distinction for linked plans.

### 9. Redundant Calendar Props — DONE (step 2)
- **Problem**: `Planner.tsx:74-75` passes both `defaultView` and controlled `view` — redundant and triggers a react-big-calendar warning.
- **Fix**: Controlled `view` + `onView` only.

### 10. No Tests
- **Problem**: No test coverage exists for the planner event mapping, recurrence expansion, wizard validation, or plan persistence.
- **Fix**: Colocated vitest tests (see Phase 5).

## Development Plan

### Phase 1: Planner.tsx
1. ~~Set `toolbar={false}` on `BigCalendar`~~ — not needed
2. ~~Build custom planner header~~ — removed header button group; toolbar consolidated into one
3. Added custom `components/PlannerToolbar.tsx`: `Today` outline pill + adjacent `ChevronLeft`/`ChevronRight` (lucide-react) + contextual date label on the left, view selector dropdown right-aligned; removed the redundant `defaultView` prop
4. Map **plans** to events with real start/end times (replace the `9 + index % 8` fabrication)
5. Expand repeating plans across their date range (`eachDayOfInterval`)
6. Attach plan event styling (plan palette, linked-plan distinction)
7. Add FAB `+` button that opens **PlanWizard**

### Phase 2: Planner.css
1. Theme colors matching App.css — **DONE (step 1)** via `--planner-*` tokens + `prefers-color-scheme: dark` set
2. Override react-big-calendar defaults (`.rbc-*`) with the app palette — headers, grids, today highlight, borders
3. Dark-mode support matching the rest of the app
4. Layout for the new custom header, plan events, and the FAB
5. Keep existing flex/height layout working with the smaller header

### Phase 3: PlanWizard Component (components/PlanWizard.tsx + .css)
Create new modal reusing `TaskWizard` conventions (overlay click + Escape close, themed card):
- Form: planner name, start time, end time, day, repeats-daily toggle + repeat end date, "Also add as Task" checkbox, "Also add as Habit" checkbox
- Validation: name required; end time after start time; repeat end date >= day
- On save:
  1. Create the plan (always)
  2. If Task checked → mount `TaskWizard` (`initialName` = plan name, `onSave` → `addTask(name, day)`)
  3. If Habit checked → mount `HabitWizard` (`onSave` → `addHabit(draft)`), after the task wizard when both are checked
  4. Cancel in a chained wizard → plan stays, that link skipped
- Close on cancel / overlay click / Escape
- Styling matching app theme

### Phase 4: Plans Store + Drive Sync (store/plans.ts, lib/googleDrive.ts)
A plan exists independently of tasks/habits, so it gets its own store (modeled on `store/tasks.ts`):
- New `PendingPlan` interface: `{ id, title, startDate, startTime, endTime, endDate, isRepeating, linkedTaskId?, linkedHabitId?, createdAt, updatedAt, synced }`
- Store actions: `addPlan`, `load`, persistence via `accountStorageKey` (same pattern as tasks), volatile/pending handling
- **Critical** — extend `lib/googleDrive.ts` or plans are silently dropped:
  - New `parsePlans`: whitelist-rebuild on load — all plan fields must be included
  - `canonicalData`: fingerprint whitelist — include plan fields or time-only edits cause lost updates / skipped writes
  - Bump schema version for the new `plans` array
- `addTask` / `addHabit` keep their existing signatures — chained wizards call them unchanged
- Tasks/Habits/Home tabs need **no changes** — linked records appear via the existing stores

### Phase 5: Testing
Colocated vitest tests following repo conventions:
- `Planner` event mapping: plans plotted at real times, no fabricated positions
- Recurrence expansion: one repeating plan → one event per day in range
- Plans store: `addPlan` persists new fields; plans load/persist correctly
- `googleDrive`: plans parse + canonical round-trip all fields
- `PlanWizard` validation: end time > start time; repeat end date >= day; chaining opens TaskWizard then HabitWizard

## Verification Checklist
- [x] Theme matches other tabs (light + dark)
- [x] Single Day/Week/Month switcher; nav buttons work
- [ ] + button opens PlanWizard with all fields
- [ ] Plan appears at its real time on the calendar
- [ ] Repeating plan appears on every day through its end date
- [ ] Task checkbox → task created, visible in Tasks tab and Home
- [ ] Habit checkbox → habit created, visible in Habits tab and Home
- [ ] Both checkboxes → task wizard then habit wizard; cancel keeps plan only
- [ ] Plans survive reload and Drive sync on a second device
- [ ] No TypeScript errors / lint errors; `npm test` passes
