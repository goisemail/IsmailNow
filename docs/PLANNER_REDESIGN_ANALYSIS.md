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

### 4. Missing + Button for Daily Planning — DONE (step 4)
- **Problem**: No add affordance in the Planner tab.
- **Fix**: FAB reuses the shared `.fab` class (identical to Home/Tasks: fixed, orange, above bottom nav — no new CSS) and opens the new **PlanWizard** modal. Implemented in `Planner.tsx` with `data-testid="planner-fab"`.

### 5. Plan for Day Feature Requirements — DONE (step 4)

The + button opens **PlanWizard** with these fields:

| Field | Type | Description |
|-------|------|-------------|
| **Planner name** | Text input | Title of the plan block |
| **Start Time** | Time input (`HH:mm`) | When the block starts on the selected day |
| **End Time** | Time input (`HH:mm`) | Must be later than start time |
| **Day** | Date input | Which day the plan applies to |
| **Repeats** | Checkbox + weekday picker + end date input | When checked, a "Repeat on" row of 7 day circles (`M T W T F S S`) appears with **all days selected by default** (daily). Deselect circles to restrict to specific weekdays (e.g. only S + S for weekends). Plan repeats on those weekdays through the end date |
| **Also add as Task** | Checkbox | On save, creates the task instantly in the Tasks tab (name = plan name, day = plan day) and links it — no extra wizard |
| **Also add as Habit** | Checkbox | On save, opens `HabitWizard` (name/colour/evaluation/frequency/priority); habit lands in Habits tab + Home |

**Approved flow:**
1. Save → the plan is created immediately (always; checkboxes optional — a plan can exist alone)
2. If **Task** checked → **one task is created per plan occurrence** (same title, each dated to its occurrence day — creation day included only if its weekday is selected) and their ids are stored in `plan.linkedTaskIds` — no wizard, since TaskWizard only collected the name the plan already has
3. If **Habit** checked → `HabitWizard` opens (it configures colour/evaluation/frequency/priority that cannot be inferred) → save calls `addHabit(draft)`
4. When both are checked: tasks created instantly for every occurrence, then the habit wizard is the only modal
5. Cancelling the habit wizard keeps the plan and the already-created tasks, and skips the habit link

**Task visibility** — matches the Home tab: `taskVisibleOnDate(task, date)` — a task shows **from its startDate onward** until completed; an uncompleted pending task piles up day by day. In the Tasks tab, pending tasks are filtered this way, so a planned task dated Oct 16 stays hidden until Oct 16, and if left uncompleted it shows on Oct 17, 19, 23, 26, 30… alongside later-occurring tasks.

**Hint labels** under the checkboxes make the difference discoverable ("Created instantly in the Tasks tab…" / "Opens the habit setup wizard…").

**Repeat nuances (implemented):**
- All 7 circles selected by default = daily repeat; empty selection falls back to daily
- Strict weekday matching: the creation day is shown **only if its weekday is selected** (e.g. created Thursday with Mon/Fri repeat → first plan is the next Friday)

**Purpose (user mental model):** the calendar shows allocated time blocks — "in this hour I do this task / this habit" — prepared ahead of the day.

### 6. Fake Event Times in Calendar Mapping — DONE (step 4)
- **Problem**: `Planner.tsx:24-27` fabricates times (`9 + index % 8`) instead of using real times, so events are plotted at meaningless positions.
- **Fix**: Map **plans** (not tasks) to events: combine `startDate` + `startTime`/`endTime` into real event start/end. Implemented via `buildEvent` in `Planner.tsx`.

### 7. No Recurrence Expansion — DONE (step 4, weekdays added later)
- **Problem**: react-big-calendar has no recurrence. A repeating plan (repeat end date) exists as a single record but must appear on every day in its range.
- **Fix**: Expand repeating plans into per-day events using date-fns (`eachDayOfInterval` between `startDate` and `endDate`) via `planOccurrenceDates`. With `repeatDays` set, only matching weekdays occur (creation day included only if its weekday is selected). Lives in `utils/planner.ts` with unit tests.

### 8. Events Ignore Plan Styling and State — DONE (step 4)
- **Problem**: Events render plain; plans have no distinct color/state, and linked vs standalone plans are indistinguishable.
- **Fix**: Plans are the only calendar content (tasks/habits live in their tabs). `eventPropGetter` colors events by link state — blue for a linked task, purple for a linked habit, app accent pink for standalone plans.

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

### Phase 3: PlanWizard Component (components/PlanWizard.tsx + .css) — DONE (step 4)
Implemented reusing `TaskWizard` conventions (overlay click + Escape close, themed card):
- Form: planner name, start time, end time, day, `Repeats` checkbox with weekday picker (7 circles, all selected by default) + repeat end date, "Also add as Task" checkbox, "Also add as Habit" checkbox
- Validation: name required; end time after start time; repeat end date >= day (no `min` attribute on the repeat date — native constraint validation would block submission and hide the themed error)
- On save:
  1. Creates the plan (always)
  2. If Task checked → creates one task per occurrence via `addTask(planName, occurrenceDate)` and links them all through `linkedTaskIds` — **no TaskWizard** (it only re-collected the plan name)
  3. If Habit checked → mounts `HabitWizard` (`onSave` → `addHabit(draft)`)
  4. Cancel in the habit wizard → plan + task stay, habit link skipped
- Close on cancel / overlay click / Escape

### Phase 4: Plans Store + Drive Sync (store/plans.ts, lib/googleDrive.ts) — DONE (step 4)
A plan exists independently of tasks/habits, so it has its own store (modeled on `store/tasks.ts`):
- `PendingPlan` interface: `{ id, title, startDate, startTime, endTime, endDate, isRepeating, repeatDays, linkedTaskId?, linkedTaskIds?, linkedHabitId?, createdAt, updatedAt, synced }` — `repeatDays` is `number[] | null` (weekday indices `0=Sun…6=Sat`; `null`/empty = daily); `linkedTaskIds` holds one id per created task occurrence
- Store actions: `addPlan` (returns id), `updatePlan`, `deletePlan`, `load`, `applySyncResult`, volatile/pending handling, `accountStorageKey('…','plans')` persistence
- `lib/googleDrive.ts` extended: new `parsePlans` (whitelist-rebuild with validation), `createDocument`/`canonicalData` include plans, schema bumped to v4 (v2/v3 files still accepted), `loadTasksFromDrive` / `saveTasksToDrive` / `restoreDriveBackup` round-trip plans
- Tasks store `syncOnce` merges + reconciles plans alongside habits; `useDriveSync` triggers flushes on plan mutations
- `addTask` / `addHabit` now return the created id (used for linking); existing callers unaffected
- `AuthContext` loads/clears/merges/exports plans; guest→Google merge and discard handle plans
- Tasks/Habits/Home tabs need **no changes** — linked records appear via the existing stores

### Phase 5: Testing — DONE (step 4)
Colocated vitest tests following repo conventions:
- `Planner` event mapping: plans plotted at real times, no fabricated positions
- Recurrence expansion: one repeating plan → one event per day in range
- Plans store: `addPlan` persists new fields; plans load/persist correctly; `updatePlan` / `deletePlan` work
- `googleDrive`: plans parse + canonical round-trip all fields
- `PlanWizard` validation: end time > start time; repeat end date >= day; chaining opens TaskWizard then HabitWizard; edit prefill + delete plan

Implemented: `store/plans.test.ts` (persist/relay/link/merge), `components/PlanWizard.test.tsx` (validation, chaining, cancel-keeps-plan, both-checkbox order), `lib/googleDrive.test.ts` extended (schema v4, plan round-trip, malformed-plan rejection, plan upload verification), `useDriveSync.test.tsx` extended (plan mutation flush).

## Verification Checklist
- [x] Theme matches other tabs (light + dark)
- [x] Single Day/Week/Month switcher; nav buttons work
- [x] Edit existing plan from calendar — prefilled modal opens; save updates dates/title/repeat
- [x] Delete plan from edit mode — red Delete button removes plan
- [x] Repeating plan appears on every day through its end date
- [x] Weekday repeat: all 7 circles default-selected; picking only Sat/Sun allocates time only on those days
- [x] Task checkbox → one task per planned occurrence, visible in Tasks tab and Home (instant, no wizard); pending tasks show from their startDate onward and pile up day by day until completed
- [x] Habit checkbox → habit created, visible in Habits tab and Home
- [x] Both checkboxes → task created instantly, habit wizard follows; cancel keeps plan + task
- [x] Plans survive reload and Drive sync on a second device (schema v4 with plan parse/canonical coverage)
- [x] No TypeScript errors / lint errors; `npm test` passes (82 tests)
