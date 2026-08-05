# Google Drive Sync Review

## Review Status

- Scope: `web/` Google Drive authentication, task synchronization, local persistence, and logout behavior
- Initial review date: 2026-07-27
- Follow-up review date: 2026-07-29
- Follow-up implementation: commit `9aeae81` on `fix/drive-sync-release-blockers`
- Reviewed implementation: `web/src/lib/googleDrive.ts`, `web/src/contexts/AuthContext.tsx`, `web/src/hooks/useDriveSync.ts`, task and habit stores, and sync UI entry points
- React Native status: the `app/` Drive backup flow is not implemented; `app/src/screens/Screens.tsx:722-727` is a placeholder
- Firebase status: Firebase is not used by the IsmailNow web Drive flow
- Overall assessment: the branch now synchronizes a validated, versioned task-and-habit document, protects volatile local state during account transitions, provides actionable OAuth recovery, resolves canonical duplicates, and creates restorable recovery snapshots. Cross-device writes remain best-effort because browser Drive v3 does not guarantee usable CAS, and tombstone purging remains intentionally disabled until device acknowledgements can prevent resurrection.

## Current Architecture

```text
Google Identity Services
        |
        | OAuth access token held in memory with drive.file scope
        v
Browser application
        |
        +-- localStorage: account-scoped task and habit state
        |                and non-sensitive profile data
        |
        +-- Google Drive REST API v3
                |
                +-- ismailnow_data.json (versioned tasks + habits)
                +-- immutable recovery snapshot copies
```

The web application requests these scopes in `web/src/contexts/AuthContext.tsx:51-56`:

```text
openid
email
profile
https://www.googleapis.com/auth/drive.file
```

The `drive.file` scope is appropriately narrower than full Drive access. It permits the app to manage files it creates or files the user explicitly opens with the app.

The Drive sync file is `ismailnow_data.json`, declared in `web/src/lib/googleDrive.ts:3`. The app:

1. Searches for matching files with Drive `files.list`.
2. Creates an empty JSON file if none exists.
3. Downloads file content with `files.get?alt=media`.
4. Merges remote and local tasks.
5. Replaces the file content with `files.update` using `PATCH` and `uploadType=media`.

Sync can run:

- Manually from the sidebar.
- Every hour.
- When the browser tab becomes hidden.
- When network connectivity returns.
- Immediately after a task is deleted.

## Follow-Up Assessment

This section supersedes the status and evidence in the original 2026-07-27 findings below. The original findings are retained for history and design context.

### Current Status By Finding

| ID | Current Status | Follow-Up Assessment |
|---|---|---|
| GD-001 | Resolved in code | Account namespaces, volatile-memory guards, flush-aware logout, and explicit guest merge/keep/export/discard choices are implemented. |
| GD-002 | Resolved in code | Tokens are memory-only and expiry-aware; terminal `401` enters actionable same-account reauthorization state and pauses automatic sync. |
| GD-003 | Resolved | Bearer tokens are no longer persisted; CSP and related security headers are configured. |
| GD-004 | Resolved in code | File creation now uses metadata creation followed by media upload. A live clean-account integration test is still required. |
| GD-005 | Mitigated | Invalid and unsupported content blocks automatic writes. Raw corrupt-content preservation and restore UI are not implemented. |
| GD-006 | Resolved in code | A versioned schema synchronizes tasks and timestamped habit records with legacy task-array migration. |
| GD-007 | Partial | One runtime serializes sync and retries detected conflicts. Strict cross-device conditional writes are not guaranteed without a usable ETag/CAS mechanism. |
| GD-008 | Resolved in code | Discovery uses canonical properties with pagination; validated duplicates are merged once and archived non-destructively. |
| GD-009 | Resolved | The unused persistent file-ID cache was removed; the remaining cache is in-memory and reset on account transitions. |
| GD-010 | Resolved in code | Changed writes and restores create immutable Drive recovery copies; Settings can list and restore them with retention. |
| GD-011 | Partial by design | Tasks and habits now carry `deletedAt`; unsafe purging remains disabled until device acknowledgement/compaction epochs exist. |
| GD-012 | Partial | The suite now covers 33 auth, Drive, persistence, hook, migration, and coordinator cases. Live Drive CAS and broader two-client tests remain. |
| GD-013 | Resolved in code | Both stores track volatile state, retry persistence, and block destructive transitions unless data is exported or explicitly discarded. |
| GD-014 | Resolved | User-info HTTP status and required profile fields are validated before account activation. |

### Remaining Priority Summary

| Priority | Related IDs | Remaining Work | Primary Risk |
|---|---|---|---|
| Medium | GD-007 | Verify or replace browser conditional-write behavior | Residual cross-device overwrite race |
| Medium | GD-011 | Add device acknowledgements and compaction epochs before enabling tombstone purge | Unbounded tombstone growth without resurrection risk |
| Medium test risk | GD-012 | Add live Drive ETag/CORS and broader two-client convergence coverage | Platform-specific conflict behavior remains unproven |

### FR-001: Habits Are Still Not Synchronized

**Development status:** Implemented. The section below records the requirement that drove the versioned task-and-habit schema.

**Severity:** High

**Related finding:** GD-006

**Pre-development evidence**

- `web/src/lib/googleDrive.ts:1-17` imports and exposes only task records and task snapshots.
- `web/src/hooks/useDriveSync.ts:22-55` flushes only the task store.
- `web/src/store/habits.ts:27-98` persists habits only to account-scoped `localStorage`.
- The habit model has no `createdAt`, `updatedAt`, sync state, or deletion tombstone needed for deterministic merging.
- Product documentation now states that task changes sync and habits remain local-only, but the capability gap remains.

**Impact**

A fresh browser or device can restore tasks from Drive but cannot restore habits, progress, or streaks. Clearing browser data can permanently remove habits unless the user has a manual export.

**Required change**

1. Introduce a versioned Drive document envelope containing tasks and habits.
2. Migrate existing raw task arrays and wrapped legacy task shapes safely.
3. Add habit mutation and deletion metadata.
4. Define conflict behavior for habit definitions, completion state, and deletions.
5. Reject unsupported future schema versions without writing.

**Required tests**

- Restore tasks and habits on a clean device.
- Migrate a legacy task array without losing tasks.
- Converge habit creation, editing, completion, and deletion across devices.
- Verify an unsupported schema remains read-only.

### FR-002: Terminal OAuth Failure Is Not Actionable

**Development status:** Implemented with typed terminal authorization failure, same-account reconnect UI, and automatic-sync blocking.

**Severity:** High

**Related finding:** GD-002

**Pre-development evidence**

- `web/src/lib/googleDrive.ts:41-54` refreshes once after a Drive `401` and retries once.
- If the retried request also returns `401`, `requireOk` converts it to a generic Drive error.
- `web/src/contexts/AuthContext.tsx:185-214` sets `reauthRequired` when token acquisition or account validation fails, but the Drive repository cannot mark a terminal API `401` as requiring reauthorization.
- `web/src/App.tsx:102-105` renders only a text banner and no dedicated reconnect action.
- Background sync continues attempting flushes while authorization requires user action.

**Impact**

The UI can remain signed in while Drive synchronization repeatedly fails. Local data remains available, but the user has no clear `Reconnect Google Drive` action.

**Required change**

1. Add a typed `DriveAuthorizationError` for a second `401`.
2. Invalidate the rejected token and propagate reauthorization state through the auth boundary.
3. Add a `reauthorize()` action that retains the current profile and local namespace, validates the returned Google UID, and triggers one coordinated follow-up sync.
4. Pause automatic sync while reauthorization is required.
5. Ensure generic task errors do not hide the authorization recovery action.

**Required tests**

- Two consecutive `401` responses produce exactly two HTTP attempts and no loop.
- Terminal `401` sets `reauthRequired` and leaves pending local data intact.
- Reconnection with the same UID clears the blocked state and starts one sync.
- Reconnection with another UID is rejected without switching local data.

### FR-003: Guest-To-Google Migration Choices Are Missing

**Development status:** Implemented with merge, keep separate, export, and post-switch discard choices.

**Severity:** Medium

**Related finding:** GD-001

**Pre-development evidence**

- `web/src/lib/accountStorage.ts:8-14` separates `guest:local` from Google account namespaces.
- `web/src/contexts/AuthContext.tsx:235-256` activates the selected Google account after profile validation.
- No flow offers merge, keep separate, export, or discard choices.

Guest records are normally retained under `guest:local`, not deleted, but become inactive and therefore appear to disappear after sign-in. Keeping guest data separate matches the implementation decision made for the release-blocker branch, but it does not satisfy the original GD-001 migration acceptance criterion.

**Required change**

1. Detect persisted and volatile guest tasks and habits before activating Google storage.
2. Offer `Merge`, `Keep separate`, `Export`, and explicit `Discard` choices.
3. Copy data transactionally and keep the guest source until target persistence succeeds.
4. Mark imported tasks pending so Drive merging occurs normally.
5. Make migration idempotent and handle ID collisions.

**Required tests**

- Merge guest tasks and habits into empty and populated Google namespaces.
- Keep-separate leaves the guest namespace unchanged and recoverable.
- Failed target persistence leaves guest state active.
- Repeating migration does not duplicate records.

### FR-004: Persistence Failure Can Still Lose In-Memory Data

**Development status:** Implemented with volatile-state tracking, persistence retry, export, and guarded transitions.

**Severity:** High

**Related findings:** GD-001, GD-013

**Pre-development evidence**

- `web/src/store/tasks.ts:113-120` and `182-187` report persistence failure but still commit the task mutation to memory.
- `web/src/store/habits.ts:27-40` follows the same volatile-memory behavior.
- `web/src/contexts/AuthContext.tsx:277-305` checks only pending Google tasks while online, then clears both stores during logout.
- Offline logout, guest logout, and account switching do not guard volatile task or habit state.

**Impact**

If `localStorage.setItem` fails, the UI can contain the only remaining copy. Logout, guest-to-Google transition, account switching, reload, or a tab crash can permanently lose that data.

**Required change**

1. Track local durability separately from cloud synchronization in both stores.
2. Expose `hasVolatileChanges` and a retry-persistence operation.
3. Guard logout and every account transition when either store is volatile.
4. Offer retry, export current memory, or explicit irreversible discard.
5. Claim that data remains on the device only after a verified local write.

**Required tests**

- Force task and habit `localStorage.setItem` calls to throw and verify volatile state.
- Offline logout with volatile data preserves the session and memory.
- Guest-to-Google transition cannot replace volatile guest state.
- Successful persistence retry clears the volatile flag and permits logout.

### FR-005: Duplicate Drive Files Remain Recurring Inputs

**Development status:** Implemented with paginated canonical discovery and non-destructive duplicate archival after verified merge.

**Severity:** Medium

**Related finding:** GD-008

**Pre-development evidence**

- `web/src/lib/googleDrive.ts:63-70` discovers files by filename and MIME type rather than canonical `appProperties`.
- New files are tagged with `app=ismailnow` and `purpose=primary-sync`, but discovery does not use those tags.
- `web/src/lib/googleDrive.ts:275-301` downloads and merges all matches, then chooses the first file for writes.
- Discovery does not paginate `files.list` results.

**Impact**

Stale duplicates can contribute records repeatedly, clock-skewed records can override canonical data, and one corrupt duplicate can block an otherwise healthy canonical file.

**Required change**

1. Paginate Drive discovery.
2. Query normal operation by canonical `appProperties`.
3. Perform a one-time validated migration of legacy filename matches.
4. Select one deterministic canonical file and archive or retag other files with a recovery window.
5. Handle concurrent creation of multiple tagged primaries deterministically.

**Required tests**

- Migrate two legacy matches into one canonical source.
- Ignore archived and unrelated same-name files during later syncs.
- Block migration safely when one candidate is corrupt.
- Resolve two tagged primary files without destructive deletion.

### FR-006: Cross-Device Writes Are Still Best-Effort

**Development status:** Partially implemented by design. Same-runtime serialization, same-browser Web Locks, version/ETag checks, backoff, and read-back verification are present. Strict multi-device CAS still requires platform proof or a backend.

**Severity:** Medium

**Related finding:** GD-007

**Current evidence**

- `web/src/store/tasks.ts:104-180` serializes one application runtime and queues a follow-up sync.
- `web/src/lib/googleDrive.ts:304-345` compares Drive versions, sends `If-Match` only when an ETag is visible, and verifies uploaded content afterward.
- The coordinator does not serialize separate tabs, browsers, or devices.
- Drive v3 does not document an expected-version parameter for media updates, and browser ETag/CORS behavior is not proven by mocked tests.

**Impact**

Without an enforceable conditional header, another writer can update between version validation and upload. Read-back verification detects some but not all write orderings.

**Required change**

For best-effort direct Drive sync:

1. Skip uploads when merged cloud content is unchanged.
2. Use an account-scoped Web Lock for same-browser tabs where supported.
3. Add randomized bounded retry backoff.
4. Run a real-browser Drive integration probe for ETag visibility, CORS, and stale `If-Match` behavior.

For guaranteed consistency, use a transactional backend with CAS or redesign synchronization around immutable operations. Do not advertise strict multi-device consistency until one of those designs is implemented.

**Required tests**

- HTTP `412` reloads, remerges, and retries within the configured limit.
- Missing ETag follows the documented best-effort policy.
- Read-back mismatch retries from a fresh remote snapshot.
- Two simulated clients converge for different IDs, identical IDs, and tombstone conflicts.

### FR-007: Recovery History And Tombstone Compaction Are Absent

**Development status:** Recovery snapshots, retention, restore UI, and `deletedAt` metadata are implemented. Tombstone purge remains disabled because safe compaction requires device acknowledgements or a compaction epoch.

**Severity:** Medium

**Related findings:** GD-010, GD-011

**Pre-development evidence**

- `web/src/lib/googleDrive.ts:318-349` overwrites one synchronization file.
- Settings provides a one-way local JSON export but no import or restore flow.
- Tasks use `isDeleted` without `deletedAt`, acknowledgement, retention, or compaction metadata.
- Every task tombstone remains in local and remote documents indefinitely.

**Impact**

The application cannot restore a previous valid state after a bad but syntactically valid merge, and the synchronization file grows indefinitely. Naive tombstone deletion would allow stale offline devices to resurrect records.

**Required change**

1. Keep the current document explicitly labeled as synchronization state.
2. Add immutable snapshots before destructive migration, restore, and compaction.
3. Add schema metadata, creation time, source revision, and checksum to snapshots.
4. Add `deletedAt`, deletion generations, and a supported offline-device policy.
5. Compact only after a verified write and recovery snapshot.

**Required tests**

- Restore creates a safety snapshot first.
- Snapshot checksum failure blocks restoration.
- Retention removes only eligible snapshots.
- Recent and unacknowledged tombstones survive compaction.
- A stale device cannot resurrect a compacted deletion.

### FR-008: Automated Coverage Is Incomplete

**Development status:** Expanded to 33 tests across auth, Drive, persistence, habits, task coordination, and `useDriveSync`. Live Drive and broader simulated convergence coverage remain.

**Severity:** High test and release risk

**Related finding:** GD-012

The current suite contains auth, Drive repository, and task coordinator coverage. Existing tests cover token scrubbing, profile validation, first-`401` recovery, corrupt-data blocking, first-file creation, pre-write version mismatch, synthetic ETag usage, account retention, and in-process serialization.

The following important cases remain untested:

- Token reuse before expiry and refresh at the expiry-skew boundary.
- Two consecutive `401` responses and actionable reauthorization.
- Successful online logout flush, failed flush with cancel, and failed flush with confirmed logout.
- Task and habit persistence failures and volatile transition guards.
- Guest migration choices and idempotency.
- `useDriveSync` interval, visibility, online, authorization, and cleanup behavior.
- Canonical duplicate discovery, pagination, migration, and archival.
- Store-level `412`, read-back mismatch, conflict retry, and retry exhaustion.
- Realistic two-client convergence and a live-browser Drive ETag/CORS probe.

### Remaining Implementation Order

1. Run a live-browser Drive integration probe for ETag exposure, CORS, and stale `If-Match` behavior.
2. Decide whether guaranteed multi-device consistency requires a transactional backend or immutable operation design.
3. Add device acknowledgements and compaction epochs before enabling tombstone purge.
4. Expand two-client convergence and snapshot-retention integration coverage.

## Original Priority Summary (2026-07-27)

| ID | Severity | Issue | Primary Risk |
|---|---|---|---|
| GD-001 | Critical | Sign-in and logout can erase unsynced local data | Permanent data loss |
| GD-002 | High | OAuth token expiration and renewal are not handled | Sync stops after token expiry |
| GD-003 | High | OAuth access token is persisted in `localStorage` | Token theft through XSS or injected scripts |
| GD-004 | High | Drive file creation uses browser `FormData` for a Drive multipart upload | Initial file creation may fail |
| GD-005 | High | Invalid or corrupted Drive JSON is treated as an empty task list | Corrupted remote data can be overwritten |
| GD-006 | High | Only tasks are synchronized; habits are local-only | Misleading backup claims and incomplete restore |
| GD-007 | Medium | Sync operations can overlap and cross-device writes are not conditional | Last-writer-wins conflicts |
| GD-008 | Medium | Duplicate Drive files are merged but never resolved | Ambiguous source of truth |
| GD-009 | Low | Drive file ID cache is written but never read | Unnecessary API calls and misleading code |
| GD-010 | Medium | A single overwritten sync file is presented as a backup | No app-controlled recovery history |
| GD-011 | Medium | Soft-delete tombstones are retained forever | Unbounded file growth |
| GD-012 | High | No automated tests cover OAuth or Drive synchronization | Regressions are likely |
| GD-013 | Medium | Local persistence failures are silently ignored | Local changes can disappear without warning |
| GD-014 | Medium | Google profile requests are not validated | Invalid sessions and unclear failures |

## Original Detailed Findings (2026-07-27)

### GD-001: Sign-In And Logout Can Erase Unsynced Data

**Severity:** Critical

**Evidence**

- `web/src/contexts/AuthContext.tsx:50-54` resets habits, tasks, and the Drive cache.
- Google sign-in invokes that reset before replacing the session at `AuthContext.tsx:117-119`.
- Logout removes the session and immediately resets local data at `AuthContext.tsx:137-140`.
- `web/src/App.tsx:76-80` calls logout without flushing pending changes.
- The task store documentation says flushing occurs on sign-out, but no sign-out flush is implemented at `web/src/store/tasks.ts:61-64`.

**Failure scenarios**

1. A user edits tasks while offline and logs out. The local edits are deleted before they can sync.
2. An expired token causes the user to sign in again. Signing in clears the same user's unsynced local state.
3. A guest creates tasks or habits and then signs in. Guest data is deleted without an import or migration choice.
4. A user accidentally signs into a different account. Existing local data is cleared before account ownership is confirmed.

**Recommended fix**

1. Make logout asynchronous.
2. Detect unsynced tasks before clearing local state.
3. If online and authenticated, flush and wait for a confirmed Drive response.
4. If the flush fails, keep local data and offer `Retry`, `Export local backup`, or `Discard and log out`.
5. Namespace local data by Google user ID instead of using one global storage key.
6. During sign-in, identify the account first, then load that account's local namespace.
7. When moving from guest mode, offer to merge guest data into the signed-in account.

**Acceptance criteria**

- Logout never removes unsynced data without explicit user confirmation.
- Signing into the same account does not reset local data.
- Switching accounts cannot expose or overwrite another account's local state.
- Guest data can be retained, merged, exported, or explicitly discarded.

**Tests**

- Create an unsynced task offline, press logout, and verify the task remains after a failed flush.
- Reauthenticate the same account and verify local tasks remain.
- Sign in as account B after account A and verify account A's local namespace is untouched.
- Create guest data, sign in, choose merge, and verify both guest and Drive data exist.

### GD-002: OAuth Token Expiration And Renewal Are Not Handled

**Severity:** High

**Evidence**

- The token response's `access_token` is stored, but `expires_in` is ignored at `web/src/contexts/AuthContext.tsx:89-115`.
- A stored session is restored directly from `localStorage` at `AuthContext.tsx:56-67`.
- No refresh, expiration check, or retry-after-401 logic exists.
- The periodic sync interval is one hour at `web/src/hooks/useDriveSync.ts:7`, approximately the normal lifetime of a Google access token.

**Impact**

The UI may continue showing the user as signed in while Drive requests return `401 Unauthorized`. Automatic synchronization can then remain broken until the user signs in again.

**Recommended fix**

1. Keep access tokens in memory, not persisted session state.
2. Track `expiresAt = issuedAt + expires_in` in memory.
3. Add a token manager that obtains a valid token before every Drive operation.
4. On a Drive `401`, request a new token once and retry the request once.
5. If silent token acquisition is unavailable, show a clear reauthentication prompt without clearing local data.
6. Prevent infinite retry loops.
7. Revoke the active token during explicit sign-out with Google Identity Services where possible.

**Acceptance criteria**

- A session restored after a browser reload can reacquire Drive authorization.
- A simulated expired token causes one reauthorization attempt and one request retry.
- Failed reauthorization leaves local data intact and marks sync as requiring attention.

**Tests**

- Mock a `401`, return a replacement token, and verify the original Drive request succeeds on one retry.
- Mock two consecutive `401` responses and verify the UI requests user action without looping.
- Advance fake timers beyond token expiry and verify a fresh token is requested before sync.

### GD-003: OAuth Access Token Is Persisted In LocalStorage

**Severity:** High

**Evidence**

- `AppUser` contains `accessToken` at `web/src/contexts/AuthContext.tsx:8-15`.
- The complete object is serialized to `localStorage` at `AuthContext.tsx:117-119`.

**Impact**

Any successful cross-site scripting attack or compromised third-party script running on the origin can read and exfiltrate the bearer token. The token grants access to Drive files covered by the app's scope until it expires or is revoked.

**Recommended fix**

- Persist only non-sensitive profile and account identifiers.
- Keep the access token in memory.
- Use a strict Content Security Policy.
- Minimize third-party scripts and pin trusted origins.
- Never log bearer tokens or include them in error reporting.

**Tests**

- Sign in and inspect `localStorage`; no access token should be present.
- Reload the app and verify it reacquires authorization instead of restoring a bearer token.
- Verify production CSP permits only required script and connection origins.

### GD-004: Drive File Creation Uses The Wrong Multipart Construction

**Severity:** High

**Evidence**

- `web/src/lib/googleDrive.ts:152-165` sends a browser `FormData` body to `uploadType=multipart`.

Browser `FormData` produces `multipart/form-data`. Google Drive's multipart upload protocol expects a `multipart/related` request containing metadata and media parts. Depending on API handling, first-time file creation may be rejected or parsed incorrectly.

Protocol reference: [Google Drive API - Upload file data](https://developers.google.com/drive/api/guides/manage-uploads#multipart)

**Recommended fix**

Use a simpler two-request flow:

1. Create metadata with `POST https://www.googleapis.com/drive/v3/files?fields=id` and an `application/json` body.
2. Upload the initial JSON content with `PATCH https://www.googleapis.com/upload/drive/v3/files/{id}?uploadType=media`.

This avoids manually constructing `multipart/related` in the browser.

**Acceptance criteria**

- A new Google account with no IsmailNow file can create and populate the file.
- The created file has MIME type `application/json` and valid JSON content.
- A failed media upload does not silently leave the app believing initialization succeeded.

**Tests**

- Mock metadata creation followed by media upload and verify both requests.
- Fail the second request and verify initialization reports an error and retries safely.
- Run an integration test against a dedicated Google test account with an empty Drive.

### GD-005: Invalid Drive Data Is Silently Converted To An Empty List

**Severity:** High

**Evidence**

- `parseTasksArray` catches all JSON and parsing errors and returns `[]` at `web/src/lib/googleDrive.ts:48-131`.
- `flushToDrive` can then merge that empty result with local state and overwrite Drive at `web/src/store/tasks.ts:314-320`.

**Impact**

A truncated, malformed, or incompatible remote document is indistinguishable from a legitimate empty task list. If local state is also empty or incomplete, the application can replace recoverable remote content with an empty file.

**Recommended fix**

1. Return a typed result such as `valid`, `empty`, `legacy`, or `corrupt`.
2. Validate required fields and document schema before accepting content.
3. Block writes when the remote document is corrupt.
4. Preserve a copy of corrupt content for recovery.
5. Display a recovery flow offering download, retry, or restore from a previous snapshot.

**Acceptance criteria**

- Invalid JSON never triggers an automatic overwrite.
- Valid empty documents remain supported.
- Legacy supported shapes migrate deterministically.

**Tests**

- Invalid JSON returns a corruption error, not an empty list.
- Valid `[]` returns an empty valid document.
- Legacy array and wrapped formats normalize correctly.
- Missing required task fields are reported or quarantined according to policy.

### GD-006: Drive Synchronization Excludes Habits

**Severity:** High

**Evidence**

- `ismailnow_data.json` is documented and implemented as a `PendingTask[]` in `web/src/lib/googleDrive.ts:4-15`.
- The Drive library imports only `PendingTask` at `googleDrive.ts:13`.
- Habits use only `localStorage` at `web/src/store/habits.ts:23-110`.
- The login page broadly says tasks are saved to Drive, but repository documentation also implies persistent cloud storage for both tasks and habits.
- Manual JSON export includes both habits and tasks at `web/src/pages/Settings.tsx:18-30`, but that export is downloaded locally and is not uploaded to Drive.

**Impact**

A user can sign in on another device and recover tasks but not habits. Users may reasonably believe Drive synchronization protects all application data.

**Recommended fix**

Replace the raw task array with a versioned document envelope:

```json
{
  "schemaVersion": 2,
  "updatedAt": "2026-07-27T00:00:00.000Z",
  "tasks": [],
  "habits": [],
  "settings": {}
}
```

Add migration support for the existing task-array format. Update UI wording to accurately state what is synchronized until coverage is complete.

**Acceptance criteria**

- A fresh device restores tasks and habits from Drive.
- Existing task-array files migrate without losing tasks.
- Unknown future schema versions are rejected safely rather than overwritten.

**Tests**

- Migrate a legacy task array to schema version 2.
- Round-trip tasks, habits, and settings through serialization.
- Verify a newer unsupported schema is read-only and produces an upgrade message.

### GD-007: Concurrent Sync Operations Are Not Coordinated

**Severity:** Medium

**Evidence**

- Hourly, visibility, online, manual, and deletion triggers can invoke sync independently.
- `web/src/hooks/useDriveSync.ts:33-60` does not serialize or deduplicate flushes.
- `saveTasksToDrive` performs an unconditional `PATCH` at `web/src/lib/googleDrive.ts:228-252`.

**Impact**

Two browser events or two devices can read the same old version, produce different merged documents, and overwrite each other. Timestamp-based merging helps only after the losing local copy participates in a later sync. Clock skew can also cause an older logical edit to win.

**Recommended fix**

- Add an in-browser sync coordinator with one active sync and one queued follow-up.
- Use conditional Drive updates with response version or ETag support if available for the chosen endpoint.
- On conflict, reload, merge again, and retry with a strict retry limit.
- Add a stable device ID and operation metadata for diagnostics.
- Do not rely solely on client wall-clock timestamps for conflict ordering.

**Tests**

- Trigger online and visibility events simultaneously and verify only one write runs at a time.
- Simulate a conditional-write conflict and verify reload, merge, and retry.
- Update the same task on two devices and verify the documented conflict policy.
- Add different tasks on two devices and verify both survive convergence.

### GD-008: Duplicate Drive Files Have No Resolution Policy

**Severity:** Medium

**Evidence**

- The app lists every non-trashed file named `ismailnow_data.json` at `web/src/lib/googleDrive.ts:29-45`.
- It downloads and merges all matches at `googleDrive.ts:188-223`.
- It stores the first file's ID and subsequently updates only that file.

**Impact**

Stale duplicate files continue contributing data on every read. Deleted or outdated tasks can be reintroduced, and users cannot know which file is authoritative.

**Recommended fix**

- Tag the canonical file with Drive `appProperties`, for example `app=ismailnow` and `purpose=primary-sync`.
- Search by `appProperties` rather than filename alone.
- During migration, select one canonical file, merge once, and move or rename duplicates after user confirmation.
- Do not automatically delete duplicate files without a recovery window.

**Tests**

- Seed two matching files and verify migration produces one canonical source.
- Verify stale duplicate content is not merged after migration.
- Verify unrelated user files with the same filename are not modified.

### GD-009: File ID Cache Is Not Used

**Severity:** Low

**Evidence**

- `FILE_ID_KEY` is written at `web/src/lib/googleDrive.ts:148`, `171`, and `197`.
- It is removed at `googleDrive.ts:259-261`.
- No code reads the cached value.

**Recommended fix**

Either remove the cache entirely or read and validate it before running `files.list`. Validation should handle `404`, permission loss, and account switching.

**Tests**

- With a valid cached ID, verify file discovery avoids a list request.
- With a stale cached ID, verify the cache is cleared and discovery runs once.

### GD-010: The Current Design Is Sync, Not A Recoverable Backup

**Severity:** Medium

The application overwrites one file on every sync. This provides cross-device state synchronization but no application-controlled list of historical restore points. Google Drive may retain revisions, but the app does not expose or manage them, and revision retention should not be assumed to satisfy backup requirements.

**Recommended fix**

Define the product behavior explicitly:

- Keep `ismailnow_data.json` as the current synchronization document.
- Optionally create timestamped backup snapshots in an `IsmailNow Backups` folder.
- Apply retention such as the latest 7 daily and 4 weekly snapshots.
- Add backup listing, preview, checksum verification, and restore confirmation.

**Tests**

- Create snapshots and verify retention removes only eligible old snapshots.
- Restore a snapshot and verify a safety snapshot is created first.
- Corrupt a snapshot and verify checksum validation blocks restoration.

### GD-011: Tombstones Are Never Purged

**Severity:** Medium

Deleted tasks remain in the document with `isDeleted: true` so deletion can propagate. There is no expiry or compaction process.

**Recommended fix**

- Add `deletedAt` rather than relying only on `updatedAt`.
- Define a conservative retention period.
- Purge only after a successful sync and after the tombstone is old enough for all supported device-offline windows.
- Retain snapshot backups before compaction.

**Tests**

- Recent tombstones survive synchronization.
- Expired tombstones are compacted only after a confirmed write.
- An old offline device cannot resurrect a task under the conflict policy.

### GD-012: Drive And OAuth Paths Have No Automated Tests

**Severity:** High

No unit, integration, or end-to-end tests were found for `googleDrive.ts`, `AuthContext`, or `useDriveSync`.

**Recommended fix**

Add:

- Vitest for unit tests.
- React Testing Library for authentication and hook behavior.
- Mock Service Worker or deterministic `fetch` mocks for Drive API scenarios.
- Playwright for browser-level login and sync UI behavior, with OAuth mocked for normal CI.
- A separate optional integration suite using a dedicated Google test account.

Avoid using a developer's personal Drive account in automated tests.

### GD-013: Local Persistence Failures Are Silently Ignored

**Severity:** Medium

**Evidence**

- Task storage write failures are ignored at `web/src/store/tasks.ts:85-90`.
- Habit storage errors are logged but not shown to the user at `web/src/store/habits.ts:43-51`.
- The README says IndexedDB is used, but the implementation uses `localStorage`.

**Impact**

Storage quota, privacy mode, browser policy, or serialization failures can leave the UI showing changes that are not durable.

**Recommended fix**

- Return persistence success or failure to callers.
- Show a persistent warning when local durability is unavailable.
- Consider IndexedDB for larger structured data and transaction support.
- Correct documentation to match the actual storage engine.

**Tests**

- Force `localStorage.setItem` to throw and verify the user sees a durability warning.
- Verify the app does not mark data as safely synchronized when local persistence failed.

### GD-014: Google Profile Responses Are Not Validated

**Severity:** Medium

**Evidence**

- The user-info response is parsed without checking `profileRes.ok` at `web/src/contexts/AuthContext.tsx:98-115`.

**Recommended fix**

- Check HTTP status before parsing.
- Validate required fields such as `sub` and `name`.
- Handle network, authorization, and malformed-response errors separately.
- Do not clear existing local data when profile loading fails.

**Tests**

- Return `401`, `500`, invalid JSON, and missing `sub`; each must fail safely without resetting data.

## Recommended Target Design

```text
AuthSessionManager
  - profile persisted by account ID
  - access token held in memory
  - expiry tracking and one-time 401 recovery

AccountStorage
  - local data namespaced by Google UID or guest ID
  - explicit persistence errors

DriveFileRepository
  - canonical file selected with appProperties
  - metadata creation followed by media upload
  - schema validation and legacy migration
  - conditional writes and conflict retries

SyncCoordinator
  - one active sync at a time
  - queued follow-up when changes occur during sync
  - observable states: idle, pending, syncing, blocked, failed

BackupService (optional)
  - immutable snapshots
  - retention and verified restore
```

## Recommended Implementation Order

### Phase 1: Prevent Data Loss

1. Stop clearing local data during sign-in.
2. Make logout flush-aware and non-destructive by default.
3. Treat invalid remote JSON as corruption, not an empty list.
4. Add tests for these three release-blocking behaviors.

### Phase 2: Repair Authentication

1. Remove bearer tokens from persisted `AppUser` state.
2. Add token expiry tracking and reacquisition.
3. Add one-time `401` recovery.
4. Add explicit sign-out revocation.

### Phase 3: Stabilize Drive Storage

1. Replace `FormData` creation with metadata creation plus media upload.
2. Introduce a versioned document envelope.
3. Add canonical `appProperties` and duplicate migration.
4. Serialize local sync operations and implement conflict retry.

### Phase 4: Complete Backup Coverage

1. Add habits and settings to the Drive schema.
2. Add import/export validation.
3. Decide whether historical snapshots are required.
4. Add restore UI and retention if snapshots are adopted.

### Phase 5: Implement React Native Support

Do not reuse browser token persistence or `localStorage` assumptions in React Native. Select native Google authorization and secure token storage appropriate to Android and iOS, then share only platform-neutral schema and merge logic.

## Test Plan

### Unit Tests

- Document parsing and schema validation.
- Legacy document migration.
- Task and habit merge rules.
- Tombstone handling and compaction.
- Token expiry calculations.
- Retry limits and error classification.
- Canonical file selection.

### Drive Repository Integration Tests With Mocked HTTP

- List finds no file, creates metadata, uploads initial media.
- List finds one canonical file.
- Cached ID returns `404`, then discovery recovers.
- Download returns valid, empty, corrupt, and unsupported schema content.
- Upload succeeds, fails, conflicts, and succeeds after one retry.
- API returns `401`, `403`, `429`, and `500`.
- Retry behavior respects `Retry-After` where applicable.
- Duplicate files migrate without destructive deletion.

### React And Store Tests

- Offline edits remain local and marked pending.
- Online recovery initiates one synchronized flush.
- Simultaneous triggers do not create concurrent writes.
- Logout waits for sync or asks for a decision.
- Sign-in does not clear data before account selection succeeds.
- Guest-to-account migration preserves data.
- Sync errors remain visible and actionable.

### End-To-End Tests

- Guest local-only workflow.
- Google user first-time Drive setup.
- Returning user restore on a clean browser profile.
- Offline edit followed by online convergence.
- Manual sync status and failure handling.
- Token-expiry reauthorization.
- Account switching with isolated local storage.
- Corrupt remote document recovery.
- Two simulated devices editing different and identical records.

### Manual Google Drive Verification

Use a dedicated test account and verify:

1. The OAuth consent screen requests only expected scopes.
2. The canonical file is created in the intended Drive location.
3. The file MIME type and content are correct.
4. The app cannot modify unrelated Drive files.
5. Revoking access in the Google account produces a safe reauthorization flow.
6. Duplicate and deleted files are handled according to policy.
7. Rate limiting and temporary network failures do not lose local changes.

### Security Tests

- Confirm no access token exists in `localStorage`, logs, analytics, or error reports.
- Validate Content Security Policy in production.
- Verify JSON rendering and imported fields cannot introduce script execution.
- Confirm authorization headers are sent only to Google API origins.
- Verify account A cannot read account B's local namespace.

## Release Acceptance Checklist

- [ ] Unsynced data survives logout, failed sign-in, token expiry, and browser restart.
- [ ] OAuth tokens are not persisted in browser storage.
- [ ] Expired tokens recover safely or request reauthentication.
- [ ] First-time Drive file creation works against a clean test account.
- [ ] Corrupt or unsupported Drive data cannot be overwritten automatically.
- [ ] Local sync operations are serialized.
- [ ] Cross-device write conflicts are detected and retried.
- [ ] One canonical Drive file is selected deterministically.
- [ ] Product text accurately states whether tasks, habits, and settings are protected.
- [ ] Automated unit and HTTP integration tests cover the failure paths.
- [ ] A restore procedure is documented and tested.
- [ ] React Native UI does not claim Drive support until the native flow is implemented.

## Review Conclusion

The web implementation is a direct Google Drive synchronization client, not a Firebase-backed system. Its narrow Drive scope and offline-first intent are good foundations. However, the current session reset behavior can delete unsynced data, token renewal is absent, remote corruption is treated as an empty dataset, and only tasks are synchronized. These issues should be addressed before expanding the feature or implementing the React Native version.
