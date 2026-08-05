import type { Habit, HabitEntry, HabitEvaluation, HabitSchedule } from '../store/habits'
import type { PendingTask } from '../store/tasks'

const DRIVE_FILE_NAME = 'ismailnow_data.json'
const SCHEMA_VERSION = 3

export type TokenProvider = (forceRefresh?: boolean) => Promise<string>

interface DriveFileMeta {
  id: string
  version: string
  name?: string
  createdTime?: string
  modifiedTime?: string
  size?: string
  appProperties?: Record<string, string>
}

export interface DriveBackup {
  id: string
  name: string
  createdTime: string
}

export interface DriveTasksSnapshot {
  tasks: PendingTask[]
  habits: Habit[]
  habitEntries: HabitEntry[]
  file: DriveFileMeta
  duplicateFileIds: string[]
  contentFingerprint: string
  requiresCanonicalMigration: boolean
}

interface SyncDocumentV3 {
  schemaVersion: 3
  updatedAt: string
  tasks: Omit<PendingTask, 'synced'>[]
  habits: Omit<Habit, 'synced'>[]
  habitEntries: Omit<HabitEntry, 'synced'>[]
}

export class DriveDataError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DriveDataError'
  }
}

export class DriveConflictError extends Error {
  constructor(message = 'The Drive file changed during synchronization.') {
    super(message)
    this.name = 'DriveConflictError'
  }
}

export class DriveAuthorizationError extends Error {
  constructor() {
    super('Google Drive authorization is no longer valid.')
    this.name = 'DriveAuthorizationError'
  }
}

let cachedFile: DriveFileMeta | null = null
let resolveFilePromise: Promise<DriveFileMeta> | null = null

async function driveFetch(getToken: TokenProvider, url: string, init: RequestInit = {}): Promise<Response> {
  const request = async (forceRefresh: boolean): Promise<Response> => {
    const token = await getToken(forceRefresh)
    return fetch(url, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    })
  }

  let response = await request(false)
  if (response.status === 401) {
    response = await request(true)
    if (response.status === 401) {
      window.dispatchEvent(new Event('ismailnow:reauth-required'))
      throw new DriveAuthorizationError()
    }
  }
  return response
}

async function requireOk(response: Response): Promise<Response> {
  if (response.ok) return response
  if (response.status === 412) throw new DriveConflictError()
  const detail = await response.text()
  throw new Error(`Drive API error ${response.status}: ${detail}`)
}

async function listDriveDataFiles(getToken: TokenProvider): Promise<DriveFileMeta[]> {
  const canonical =
    "appProperties has { key='app' and value='ismailnow' } and " +
    "appProperties has { key='purpose' and value='primary-sync' }"
  const legacy = `name='${DRIVE_FILE_NAME}' and mimeType='application/json'`
  const query = `((${canonical}) or (${legacy})) and trashed=false`
  const files: DriveFileMeta[] = []
  let pageToken: string | undefined

  do {
    const url =
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}` +
      '&pageSize=100&orderBy=createdTime asc' +
      '&fields=nextPageToken,files(id,version,createdTime,size,appProperties)' +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '')
    const response = await requireOk(await driveFetch(getToken, url))
    const body = (await response.json()) as { files?: DriveFileMeta[]; nextPageToken?: string }
    files.push(...(body.files ?? []))
    pageToken = body.nextPageToken
  } while (pageToken)

  return files.sort((left, right) => {
    const leftCanonical = left.appProperties?.purpose === 'primary-sync' ? 0 : 1
    const rightCanonical = right.appProperties?.purpose === 'primary-sync' ? 0 : 1
    return leftCanonical - rightCanonical ||
      (left.createdTime ?? '').localeCompare(right.createdTime ?? '') ||
      left.id.localeCompare(right.id)
  })
}

function validDate(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : value.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined
  const [year, month, day] = date.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day ? date : undefined
}

function validTimestamp(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim() || !Number.isFinite(Date.parse(value))) return undefined
  return new Date(value).toISOString()
}

function fallbackId(seed: string): string {
  let hash = 0
  for (let offset = 0; offset < seed.length; offset += 1) {
    hash = (hash * 31 + seed.charCodeAt(offset)) >>> 0
  }
  return `legacy_${hash.toString(36)}`
}

function parseTasks(candidates: unknown[]): PendingTask[] {
  const ids = new Set<string>()
  return candidates.map((item, index) => {
    if (!item || typeof item !== 'object') throw new DriveDataError(`Task ${index + 1} is not an object.`)
    const raw = item as Record<string, unknown>
    const titleValue = typeof raw.title === 'string' ? raw.title : raw.name
    const title = typeof titleValue === 'string' ? titleValue.trim() : ''
    if (!title) throw new DriveDataError(`Task ${index + 1} has no title.`)
    const startDate = validDate(raw.startDate) ?? validDate(raw.date) ?? validDate(raw.createdAt)
    if (!startDate) throw new DriveDataError(`Task ${index + 1} has no valid start date.`)
    const createdAt = validTimestamp(raw.createdAt) ?? validTimestamp(raw.created) ?? `${startDate}T00:00:00.000Z`
    const updatedAt = validTimestamp(raw.updatedAt) ?? createdAt
    const id = typeof raw.id === 'string' && raw.id.trim()
      ? raw.id
      : fallbackId(`${title}|${startDate}|${createdAt}|${index}`)
    if (ids.has(id)) throw new DriveDataError(`The Drive sync file contains duplicate task ID ${id}.`)
    ids.add(id)
    const completedValue = raw.completedDate ?? raw.completedAt ?? raw.doneDate
    const completedDate = completedValue === undefined ? undefined : validDate(completedValue)
    if (completedValue !== undefined && !completedDate) {
      throw new DriveDataError(`Task ${index + 1} has an invalid completion date.`)
    }
    const deletedAt = raw.deletedAt === undefined ? undefined : validTimestamp(raw.deletedAt)
    if (raw.deletedAt !== undefined && !deletedAt) throw new DriveDataError(`Task ${index + 1} has invalid deletion metadata.`)
    return {
      id,
      title,
      startDate,
      createdAt,
      updatedAt,
      synced: true,
      ...(typeof raw.backgroundColor === 'string' ? { backgroundColor: raw.backgroundColor } : {}),
      ...(completedDate ? { completedDate } : {}),
      ...(raw.isDeleted === true ? { isDeleted: true } : {}),
      ...(deletedAt ? { deletedAt } : {}),
    }
  })
}

function parseHabits(candidates: unknown[]): Habit[] {
  const ids = new Set<string>()
  return candidates.map((item, index) => {
    if (!item || typeof item !== 'object') throw new DriveDataError(`Habit ${index + 1} is not an object.`)
    const raw = item as Record<string, unknown>
    if (typeof raw.id !== 'string' || !raw.id.trim()) throw new DriveDataError(`Habit ${index + 1} has no ID.`)
    if (ids.has(raw.id)) throw new DriveDataError(`The Drive sync file contains duplicate habit ID ${raw.id}.`)
    ids.add(raw.id)
    if (typeof raw.name !== 'string' || !raw.name.trim()) throw new DriveDataError(`Habit ${index + 1} has no name.`)
    const createdAt = validTimestamp(raw.createdAt) ?? '1970-01-01T00:00:00.000Z'
    const updatedAt = validTimestamp(raw.updatedAt) ?? createdAt
    const deletedAt = raw.deletedAt === undefined ? undefined : validTimestamp(raw.deletedAt)
    if (raw.deletedAt !== undefined && !deletedAt) throw new DriveDataError(`Habit ${index + 1} has invalid deletion metadata.`)
    const evaluation = raw.evaluation && typeof raw.evaluation === 'object'
      ? raw.evaluation as HabitEvaluation
      : { type: 'counter' as const, criterion: 'atLeast' as const, target: 10 }
    const schedule = raw.schedule && typeof raw.schedule === 'object'
      ? raw.schedule as HabitSchedule
      : { type: 'everyDay' as const }
    return {
      id: raw.id,
      name: raw.name,
      color: typeof raw.color === 'string' ? raw.color : '#E7F5FF',
      ...(typeof raw.description === 'string' ? { description: raw.description } : {}),
      category: typeof raw.category === 'string' ? raw.category : 'Other',
      priority: typeof raw.priority === 'number' ? raw.priority : 0,
      evaluation,
      schedule,
      startDate: validDate(raw.startDate) ?? createdAt.slice(0, 10),
      ...(validDate(raw.endDate) ? { endDate: validDate(raw.endDate) } : {}),
      ...(validTimestamp(raw.archivedAt) ? { archivedAt: validTimestamp(raw.archivedAt) } : {}),
      createdAt,
      updatedAt,
      synced: true,
      ...(raw.isDeleted === true ? { isDeleted: true } : {}),
      ...(deletedAt ? { deletedAt } : {}),
    }
  })
}

function parseHabitEntries(candidates: unknown[]): HabitEntry[] {
  const ids = new Set<string>()
  return candidates.map((item, index) => {
    if (!item || typeof item !== 'object') throw new DriveDataError(`Habit entry ${index + 1} is not an object.`)
    const raw = item as Record<string, unknown>
    if (typeof raw.id !== 'string' || typeof raw.habitId !== 'string') {
      throw new DriveDataError(`Habit entry ${index + 1} has no ID.`)
    }
    if (ids.has(raw.id)) throw new DriveDataError(`Duplicate habit entry ID ${raw.id}.`)
    ids.add(raw.id)
    const date = validDate(raw.date)
    const createdAt = validTimestamp(raw.createdAt)
    const updatedAt = validTimestamp(raw.updatedAt)
    const states = ['completed', 'failed', 'inProgress', 'skipped']
    if (!date || !createdAt || !updatedAt || typeof raw.state !== 'string' || !states.includes(raw.state)) {
      throw new DriveDataError(`Habit entry ${index + 1} is invalid.`)
    }
    return {
      id: raw.id,
      habitId: raw.habitId,
      date,
      state: raw.state as HabitEntry['state'],
      ...(typeof raw.value === 'number' ? { value: raw.value } : {}),
      ...(typeof raw.targetSnapshot === 'number' ? { targetSnapshot: raw.targetSnapshot } : {}),
      ...(typeof raw.note === 'string' ? { note: raw.note } : {}),
      createdAt,
      updatedAt,
      synced: true,
      ...(raw.isDeleted === true ? { isDeleted: true } : {}),
      ...(validTimestamp(raw.deletedAt) ? { deletedAt: validTimestamp(raw.deletedAt) } : {}),
    }
  })
}

function migrateLegacyHabitEntries(candidates: unknown[], habits: Habit[]): HabitEntry[] {
  return candidates.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const raw = item as Record<string, unknown>
    const progress = typeof raw.progress === 'number' ? raw.progress : 0
    const date = validDate(raw.lastCompletedDate)
    if (!date || progress <= 0) return []
    const value = Math.max(1, Math.round(progress * 10))
    return [{
      id: `${habits[index].id}:${date}`,
      habitId: habits[index].id,
      date,
      state: value >= 10 ? 'completed' as const : 'inProgress' as const,
      value,
      targetSnapshot: 10,
      createdAt: habits[index].updatedAt,
      updatedAt: habits[index].updatedAt,
      synced: true,
    }]
  })
}

export function parseSyncDocument(text: string): { tasks: PendingTask[]; habits: Habit[]; habitEntries: HabitEntry[] } {
  if (!text.trim()) throw new DriveDataError('The Drive sync file is empty or truncated.')
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new DriveDataError('The Drive sync file contains invalid JSON.')
  }
  if (Array.isArray(parsed)) return { tasks: parseTasks(parsed), habits: [], habitEntries: [] }
  if (!parsed || typeof parsed !== 'object') throw new DriveDataError('The Drive sync file has an unsupported structure.')
  const wrapped = parsed as { schemaVersion?: unknown; tasks?: unknown; habits?: unknown; habitEntries?: unknown; data?: { tasks?: unknown; habits?: unknown } }
  if (wrapped.schemaVersion !== undefined && wrapped.schemaVersion !== 2 && wrapped.schemaVersion !== SCHEMA_VERSION) {
    throw new DriveDataError('The Drive sync file uses an unsupported schema version.')
  }
  const taskCandidates = Array.isArray(wrapped.tasks)
    ? wrapped.tasks
    : (Array.isArray(wrapped.data?.tasks) ? wrapped.data.tasks : undefined)
  if (!taskCandidates) throw new DriveDataError('The Drive sync file has an unsupported structure.')
  const habitCandidates = Array.isArray(wrapped.habits)
    ? wrapped.habits
    : (Array.isArray(wrapped.data?.habits) ? wrapped.data.habits : [])
  const habits = parseHabits(habitCandidates)
  const habitEntries = Array.isArray(wrapped.habitEntries)
    ? parseHabitEntries(wrapped.habitEntries)
    : migrateLegacyHabitEntries(habitCandidates, habits)
  return { tasks: parseTasks(taskCandidates), habits, habitEntries }
}

export function parseTasksDocument(text: string): PendingTask[] {
  return parseSyncDocument(text).tasks
}

function withoutSynced<T extends { synced: boolean }>(records: T[]): Omit<T, 'synced'>[] {
  return records.map((record) => {
    const cloudRecord: Partial<T> = { ...record }
    delete cloudRecord.synced
    return cloudRecord as Omit<T, 'synced'>
  })
}

function createDocument(tasks: PendingTask[], habits: Habit[], habitEntries: HabitEntry[]): SyncDocumentV3 {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    tasks: withoutSynced(tasks),
    habits: withoutSynced(habits),
    habitEntries: withoutSynced(habitEntries),
  }
}

function canonicalData(tasks: PendingTask[], habits: Habit[], habitEntries: HabitEntry[]): string {
  return JSON.stringify({
    tasks: withoutSynced(tasks)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((task) => ({
        id: task.id,
        title: task.title,
        backgroundColor: task.backgroundColor ?? null,
        startDate: task.startDate,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        completedDate: task.completedDate ?? null,
        isDeleted: task.isDeleted === true,
        deletedAt: task.deletedAt ?? null,
      })),
    habits: withoutSynced(habits)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((habit) => ({
        id: habit.id,
        name: habit.name,
        color: habit.color,
        description: habit.description ?? null,
        category: habit.category,
        priority: habit.priority,
        evaluation: habit.evaluation,
        schedule: habit.schedule,
        startDate: habit.startDate,
        endDate: habit.endDate ?? null,
        archivedAt: habit.archivedAt ?? null,
        createdAt: habit.createdAt,
        updatedAt: habit.updatedAt,
        isDeleted: habit.isDeleted === true,
        deletedAt: habit.deletedAt ?? null,
      })),
    habitEntries: withoutSynced(habitEntries)
      .sort((left, right) => left.id.localeCompare(right.id)),
  })
}

async function initializeFile(getToken: TokenProvider, file: DriveFileMeta): Promise<DriveFileMeta> {
  const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=media&fields=id,version,size,appProperties`
  const upload = await requireOk(await driveFetch(getToken, uploadUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createDocument([], [], [])),
  }))
  const uploaded = (await upload.json()) as DriveFileMeta
  const metadataUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?fields=id,version,size,appProperties`
  const metadata = await requireOk(await driveFetch(getToken, metadataUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appProperties: { app: 'ismailnow', purpose: 'primary-sync', initialization: 'ready' } }),
  }))
  return { ...uploaded, ...((await metadata.json()) as DriveFileMeta) }
}

export async function getOrCreateDriveFile(getToken: TokenProvider): Promise<DriveFileMeta> {
  if (cachedFile) return cachedFile
  if (resolveFilePromise) return resolveFilePromise
  resolveFilePromise = (async () => {
    const files = await listDriveDataFiles(getToken)
    if (files.length > 0) {
      const existing = files[0]
      cachedFile = existing.appProperties?.initialization === 'pending'
        ? await initializeFile(getToken, existing)
        : existing
      return cachedFile
    }
    const response = await requireOk(await driveFetch(getToken,
      'https://www.googleapis.com/drive/v3/files?fields=id,version,size,appProperties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: DRIVE_FILE_NAME,
          mimeType: 'application/json',
          appProperties: { app: 'ismailnow', purpose: 'primary-sync', initialization: 'pending' },
        }),
      }))
    const created = (await response.json()) as DriveFileMeta
    if (!created.id) throw new Error('Drive did not return an ID for the new sync file.')
    cachedFile = await initializeFile(getToken, created)
    return cachedFile
  })()
  try {
    return await resolveFilePromise
  } finally {
    resolveFilePromise = null
  }
}

async function readFile(getToken: TokenProvider, fileId: string): Promise<{ tasks: PendingTask[]; habits: Habit[]; habitEntries: HabitEntry[] }> {
  const response = await requireOk(await driveFetch(getToken, `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`))
  return parseSyncDocument(await response.text())
}

export async function loadTasksFromDrive(getToken: TokenProvider): Promise<DriveTasksSnapshot> {
  let files = await listDriveDataFiles(getToken)
  if (files.length === 0) files = [await getOrCreateDriveFile(getToken)]
  else files = await Promise.all(files.map((file) => file.appProperties?.initialization === 'pending'
    ? initializeFile(getToken, file)
    : file))
  const snapshots = await Promise.all(files.map(async (file) => ({ file, data: await readFile(getToken, file.id) })))
  const tasks = new Map<string, PendingTask>()
  const habits = new Map<string, Habit>()
  const habitEntries = new Map<string, HabitEntry>()
  for (const snapshot of snapshots) {
    for (const task of snapshot.data.tasks) {
      const current = tasks.get(task.id)
      if (!current || task.updatedAt > current.updatedAt) tasks.set(task.id, task)
    }
    for (const habit of snapshot.data.habits) {
      const current = habits.get(habit.id)
      if (!current || habit.updatedAt > current.updatedAt) habits.set(habit.id, habit)
    }
    for (const entry of snapshot.data.habitEntries) {
      const current = habitEntries.get(entry.id)
      if (!current || entry.updatedAt > current.updatedAt) habitEntries.set(entry.id, entry)
    }
  }
  cachedFile = snapshots[0].file
  return {
    file: snapshots[0].file,
    tasks: Array.from(tasks.values()),
    habits: Array.from(habits.values()),
    habitEntries: Array.from(habitEntries.values()),
    duplicateFileIds: snapshots.slice(1).map((snapshot) => snapshot.file.id),
    contentFingerprint: canonicalData(
      Array.from(tasks.values()),
      Array.from(habits.values()),
      Array.from(habitEntries.values()),
    ),
    requiresCanonicalMigration: snapshots[0].file.appProperties?.purpose !== 'primary-sync',
  }
}

async function getCurrentFile(getToken: TokenProvider, fileId: string): Promise<{ file: DriveFileMeta; etag: string | null }> {
  const response = await requireOk(await driveFetch(getToken,
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,version,size,appProperties`))
  return { file: (await response.json()) as DriveFileMeta, etag: response.headers.get('etag') }
}

async function archiveDuplicate(getToken: TokenProvider, fileId: string): Promise<void> {
  await requireOk(await driveFetch(getToken,
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `ismailnow_duplicate_${fileId}.json`,
        appProperties: { app: 'ismailnow', purpose: 'duplicate-recovery' },
      }),
    }))
}

async function createRecoverySnapshot(
  getToken: TokenProvider,
  file: DriveFileMeta,
  reason: string,
): Promise<void> {
  const timestamp = new Date().toISOString()
  await requireOk(await driveFetch(getToken,
    `https://www.googleapis.com/drive/v3/files/${file.id}/copy?fields=id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `ismailnow_backup_${timestamp.replace(/[:.]/g, '-')}.json`,
        appProperties: { app: 'ismailnow', purpose: 'backup', reason, createdAt: timestamp },
      }),
    }))

  const backups = await listDriveBackups(getToken)
  await Promise.all(backups.slice(11).map(async (backup) => {
    await requireOk(await driveFetch(getToken,
      `https://www.googleapis.com/drive/v3/files/${backup.id}`, { method: 'DELETE' }))
  }))
}

export async function listDriveBackups(getToken: TokenProvider): Promise<DriveBackup[]> {
  const query =
    "appProperties has { key='app' and value='ismailnow' } and " +
    "appProperties has { key='purpose' and value='backup' } and trashed=false"
  const response = await requireOk(await driveFetch(getToken,
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}` +
    '&pageSize=100&orderBy=createdTime desc&fields=files(id,name,createdTime)'))
  const body = (await response.json()) as { files?: DriveBackup[] }
  return body.files ?? []
}

export async function saveTasksToDrive(
  getToken: TokenProvider,
  tasks: PendingTask[],
  base: DriveFileMeta,
  habits: Habit[] = [],
  habitEntries: HabitEntry[] = [],
  duplicateFileIds: string[] = [],
  baseFingerprint?: string,
  createBackup = true,
  requiresCanonicalMigration = false,
): Promise<DriveFileMeta> {
  if (baseFingerprint === canonicalData(tasks, habits, habitEntries) && duplicateFileIds.length === 0) {
    return base
  }
  const current = await getCurrentFile(getToken, base.id)
  if (current.file.version !== base.version) throw new DriveConflictError()
  if (createBackup && (
    base.appProperties?.purpose === 'primary-sync' ||
    duplicateFileIds.length > 0 ||
    requiresCanonicalMigration
  )) {
    await createRecoverySnapshot(getToken, base, duplicateFileIds.length ? 'duplicate-migration' : 'pre-sync')
  }
  const document = createDocument(tasks, habits, habitEntries)
  const response = await requireOk(await driveFetch(getToken,
    `https://www.googleapis.com/upload/drive/v3/files/${base.id}?uploadType=media&fields=id,version,size,appProperties`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(current.etag ? { 'If-Match': current.etag } : {}) },
      body: JSON.stringify(document),
    }))
  const updated = (await response.json()) as DriveFileMeta
  const verified = await readFile(getToken, base.id)
  if (canonicalData(verified.tasks, verified.habits, verified.habitEntries) !== canonicalData(tasks, habits, habitEntries)) {
    throw new DriveConflictError('The Drive write was replaced before it could be verified.')
  }
  await requireOk(await driveFetch(getToken,
    `https://www.googleapis.com/drive/v3/files/${base.id}?fields=id,version,size,appProperties`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appProperties: { app: 'ismailnow', purpose: 'primary-sync', initialization: 'ready' } }),
    }))
  await Promise.all(duplicateFileIds.map((fileId) => archiveDuplicate(getToken, fileId)))
  cachedFile = updated
  return updated
}

export async function restoreDriveBackup(
  getToken: TokenProvider,
  backupId: string,
): Promise<{ tasks: PendingTask[]; habits: Habit[]; habitEntries: HabitEntry[] }> {
  const backup = await readFile(getToken, backupId)
  const current = await loadTasksFromDrive(getToken)
  await createRecoverySnapshot(getToken, current.file, 'pre-restore')
  await saveTasksToDrive(
    getToken,
    backup.tasks.map((task) => ({ ...task, synced: true })),
    current.file,
    backup.habits.map((habit) => ({ ...habit, synced: true })),
    backup.habitEntries.map((entry) => ({ ...entry, synced: true })),
    current.duplicateFileIds,
    undefined,
    false,
    false,
  )
  return backup
}

export function clearDriveCache(): void {
  cachedFile = null
  resolveFilePromise = null
}
