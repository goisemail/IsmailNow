# Planner Tab Redesign - Analysis

## Issues Identified

### 1. Theme Mismatch
- **Problem**: Planner header uses white background, doesn't match app's `#F8F9FA` with `#212529` text scheme
- **Root cause**: Uses Bootstrap `btn-primary`/`btn-outline-secondary` without custom Planner CSS integration
- **Fix**: Add Planner-specific theme colors matching App.css `.btn-primary` (`#E72372`) and body background

### 2. Duplicate Day/Week/Month Display
- **Problem**: 
  - Explicit button group in planner header (lines 37-62)
  - `react-big-calendar` renders its own view toolbar at calendar top
  - Both show Day/Week/Month = duplicate UI, wastes vertical space
- **Fix**: Remove header button group entirely; rely on calendar views only, or customize calendar toolbar

### 3. Navigation Toolbar Wasting Space
- **Problem**: `react-big-calendar` default toolbar shows "prev today next" buttons
- **Takes significant space** at top of calendar view
- **Fix**: Set `toolbar={false}` and add custom navigation buttons in header:
  - **Left**: Previous week button
  - **Middle**: Today button  
  - **Right**: Next week button

### 4. Missing + Button for Daily Planning
- **Problem**: No floating action button or add button in planner tab
- Other tabs have: Tasks FAB (`+`)+, Habits header button ("Add Habit"), Dashboard FAB
- **Fix**: Add FAB or header button that opens planning modal

### 5. Plan for Day Feature Requirements
The + button should open a modal with these fields:

| Field | Type | Description |
|-------|------|-------------|
| **Task Name** | Text input | Title of the task |
| **Time** | Time picker | Start time for the task |
| **Time Range** | Start/End time | Duration of task |
| **Day** | Date selector | Which day the task applies to |
| **Repeater** | Toggle + end date | If checked, set repeat end date |
| **Status** | Active/Completed | Default active |

### 6. Timer → Task Integration
- When task planned from timer, must also add to tasks store
- Tasks store `addTask(title, startDate)` needs extension for time/repeat
- Need to pass: title, startDate (with time), endDate (for repeater), isRepeating flag

### 7. date-fns Locale Error (Critical Fix)
- **Problem**: `Cannot read properties of undefined (reading 'undefined')` at `DateLocalizer.firstOfWeek`
- **Cause**: Passing `enUS` directly to `dateFnsLocalizer` instead of wrapping in `locales` object
- **Fix**: Use `const locales = { 'en-US': enUS }` and `dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })`

## Development Plan

### Phase 1: Planner.tsx
1. Set `toolbar={false}` on `BigCalendar` to remove default toolbar
2. Add custom header navigation with:
   - Left: Prev week button
   - Middle: Today button  
   - Right: Next week button
3. Add FAB-style + button that opens planning modal
4. Keep calendar event mapping logic
5. Fix locale: use `locales = { 'en-US': enUS }` pattern

### Phase 2: Planner.css
1. Add theme colors matching App.css:
   - `.planner-page` background: `#F8F9FA`
   - Text color: `#212529`
   - Button primary: `#E72372`
   - Button secondary: `#6C757D`
2. Override all `react-big-calendar` default backgrounds with `!important`
3. Ensure calendar events, toolbars, buttons, selected states all use app colors

### Phase 3: Planning Modal Component (PlannerAddTaskModal.tsx)
Create new component with:
- Form: task name, time picker, repeat toggle, end date picker
- On save: call extended `addTask` with time/repeat info
- Close on cancel
- Styling matching app theme

### Phase 4: Tasks Store Extension (tasks.ts)
Update `PendingTask` interface with:
- `startTime?: string`
- `endTime?: string`
- `endDate?: string | null`
- `isRepeating?: boolean`

Update `addTask` signature:
```typescript
addTask: (title: string, startDate: string, endDate?: string, isRepeating?: boolean, startTime?: string, endTime?: string) => Promise<void>
```

### Phase 5: Testing
- Verify theme matches other tabs (Tasks, Habits)
- Test day/week/month view toggling
- Test + button opens modal with all fields
- Test repeat functionality with end date
- Verify timer → task integration