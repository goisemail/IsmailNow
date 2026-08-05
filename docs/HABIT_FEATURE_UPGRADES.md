# Habit Feature Upgrades

This document tracks upcoming habit functionality and identifies the implementation files to review when starting each upgrade.

## Current Baseline

The web application currently supports:

- Dated habit entries with completed, failed, in-progress, and skipped states.
- Binary and numeric counter evaluations.
- At-least, at-most, exactly, and track-any-value counter criteria.
- Daily and selected-weekday schedules.
- Start and optional end dates.
- Categories, priorities, descriptions, and colors.
- Schedule-derived completion rates and streaks.
- Five-step habit creation and editing.
- Habit history events and statistics pages.
- Account-scoped local persistence and Google Drive schema version 3 synchronization.
- Legacy aggregate-habit migration into dated entries.

## Upcoming Features

### 1. Reminders and Notifications

Add one or more reminders per habit, notification permissions, reminder scheduling, and rescheduling when a habit changes.

Primary files:

- `web/src/store/habits.ts`: reminder model and persistence state.
- `web/src/components/HabitWizard.tsx`: reminder configuration step or settings controls.
- `web/src/lib/googleDrive.ts`: reminder schema validation and synchronization.
- `web/src/contexts/AuthContext.tsx`: account migration and cleanup.
- `web/src/main.tsx`: service worker integration.
- `web/src/components/HabitWizard.test.tsx`: reminder form tests.
- `web/src/store/habits.test.ts`: reminder persistence tests.

Acceptance criteria:

- Users can add, edit, disable, and remove reminders.
- Notifications respect the habit schedule and local timezone.
- Editing, archiving, or deleting a habit updates pending notifications.
- Reminder data survives reload and Drive synchronization.

### 2. Timer and Checklist Evaluations

Extend `HabitEvaluation` beyond binary and counter modes.

Primary files:

- `web/src/store/habits.ts`: timer/checklist evaluation and entry models.
- `web/src/components/HabitWizard.tsx`: evaluation setup interfaces.
- `web/src/pages/Dashboard.tsx`: timer and checklist tracking controls.
- `web/src/pages/Habits.tsx`: list summaries and quick actions.
- `web/src/pages/HabitDetails.tsx`: progress and statistics presentation.
- `web/src/lib/googleDrive.ts`: schema parsing and serialization.
- `web/src/store/habits.test.ts`: evaluation and statistics tests.

Acceptance criteria:

- Timer entries retain elapsed duration and can safely resume after reload.
- Checklist entries retain item-level completion state.
- Completion is derived from the configured timer target or checklist rule.
- Existing binary and counter habits remain unchanged.

### 3. Flexible Recurrence

Support interval schedules, monthly rules, selected dates, and a configurable number of occurrences per period.

Primary files:

- `web/src/store/habits.ts`: expand `HabitSchedule` and `habitIsDueOnDate()`.
- `web/src/components/HabitWizard.tsx`: recurrence controls.
- `web/src/pages/Dashboard.tsx`: date-based filtering.
- `web/src/pages/History.tsx`: calendar representation.
- `web/src/pages/HabitDetails.tsx`: schedule description.
- `web/src/lib/googleDrive.ts`: schedule validation and migration.
- `web/src/store/habits.test.ts`: date-boundary and recurrence tests.

Acceptance criteria:

- Due-date calculations are deterministic across timezones.
- Statistics count only dates required by the configured schedule.
- Schedule changes preserve historical entry meaning.
- End dates and archived dates remain respected.

### 4. Long-Term Goals

Add goals such as completing a habit a number of times or accumulating a value within a week, month, or custom period.

Primary files:

- `web/src/store/habits.ts`: goal definitions and period aggregation.
- `web/src/components/HabitWizard.tsx`: goal configuration.
- `web/src/pages/HabitDetails.tsx`: goal progress and historical periods.
- `web/src/pages/Habits.tsx`: compact goal progress.
- `web/src/pages/History.tsx`: period summaries.
- `web/src/lib/googleDrive.ts`: goal schema synchronization.
- `web/src/store/habits.test.ts`: period and rollover tests.

Acceptance criteria:

- Goal progress is derived from dated entries rather than stored aggregates.
- Weekly and monthly boundaries use the user's local calendar settings.
- Previous periods remain available for statistics.

### 5. Multi-Device Conflict Protection

The current synchronization checks Drive file versions before upload, but strict compare-and-swap protection requires authoritative conditional writes or a transactional backend.

Primary files:

- `web/src/lib/googleDrive.ts`: conditional-write or backend API integration.
- `web/src/store/tasks.ts`: synchronization retries and reconciliation.
- `web/src/hooks/useDriveSync.ts`: sync scheduling and user-visible status.
- `web/src/lib/googleDrive.test.ts`: concurrent-writer and retry tests.
- `bugs/GOOGLE_DRIVE_SYNC_REVIEW.md`: existing risk analysis and decisions.

Acceptance criteria:

- Two devices cannot silently overwrite changes uploaded concurrently.
- Conflicts are retried against the latest authoritative document.
- Failed conflict resolution leaves local changes pending and visible.
- Tasks, habits, and habit entries are committed as one logical snapshot.

### 6. Tombstone Compaction

Safely remove synchronized deletion records without allowing an offline device to resurrect deleted habits or entries.

Primary files:

- `web/src/store/habits.ts`: habit and entry tombstone lifecycle.
- `web/src/store/tasks.ts`: task tombstone lifecycle and sync coordination.
- `web/src/lib/googleDrive.ts`: compaction metadata and document migration.
- `web/src/contexts/AuthContext.tsx`: account cleanup behavior.
- `web/src/store/habits.test.ts`: deletion and resurrection tests.
- `web/src/store/tasks.test.ts`: task compaction tests.

Acceptance criteria:

- Compaction occurs only after deletion is acknowledged by all supported sync participants or after an explicitly documented retention policy.
- Offline data cannot recreate a compacted record.
- Backups remain restorable after compaction.

## Maintenance Tasks

- Resolve the Fast Refresh lint warning in `web/src/contexts/AuthContext.tsx` by moving shared exports to a separate module.
- Replace explicit `any` view types in `web/src/pages/Planner.tsx` with React Big Calendar types.
- Keep `web/src/store/habits.test.ts`, `web/src/lib/googleDrive.test.ts`, and `web/src/components/HabitWizard.test.tsx` updated with every schema or behavior change.

## Recommended Order

1. Flexible recurrence, because reminders and statistics depend on due-date rules.
2. Reminders and notifications.
3. Timer and checklist evaluations.
4. Long-term goals.
5. Multi-device conflict protection.
6. Tombstone compaction after the conflict protocol is defined.

## Validation Commands

Run from `web/` after each upgrade:

```bash
npm run type-check
npm test -- --run
npm run lint
npm run build
```

Also run `git diff --check` from the repository root before committing.
