import type { PendingTask } from '../store/tasks'

const DRIVE_FILE_NAME = 'ismailnow_data.json'

export type TokenProvider = (forceRefresh?: boolean) => Promise<string>

interface DriveFileMeta {
  id: string
  version: string
  size?: string
  appProperties?: Record<string, string>
}

export interface DriveTasksSnapshot {
  tasks: PendingTask[]
  file: DriveFileMeta
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

let cachedFile: DriveFileMeta | null = null
let resolveFilePromise: Promise<DriveFileMeta> | null = null

async function driveFetch(
  getToken: TokenProvider,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const request = async (forceRefresh: boolean): Promise<Response> => {
    const token = await getToken(forceRefresh)
    return fetch(url, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    })
  }

  let response = await request(false)
  if (response.status === 401) response = await request(true)
  return response
}

async function requireOk(response: Response): Promise<Response> {
  if (response.ok) return response
  const detail = await response.text()
  throw new Error(`Drive API error ${response.status}: ${detail}`)
}

async function listDriveDataFiles(getToken: TokenProvider): Promise<DriveFileMeta[]> {
  const query = `name='${DRIVE_FILE_NAME}' and mimeType='application/json' and trashed=false`
  const url =
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}` +
    '&fields=files(id,version,size,appProperties)&orderBy=createdTime asc'
  const response = await requireOk(await driveFetch(getToken, url))
  const body = (await response.json()) as { files?: DriveFileMeta[] }
  return body.files ?? []
}

function validDate(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : value.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined
  const [year, month, day] = date.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
    ? date
    : undefined
}

function validTimestamp(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim() || !Number.isFinite(Date.parse(value))) {
    return undefined
  }
  return new Date(value).toISOString()
}

function fallbackId(title: string, startDate: string, createdAt: string, index: number): string {
  const seed = `${title}|${startDate}|${createdAt}|${index}`
  let hash = 0
  for (let offset = 0; offset < seed.length; offset += 1) {
    hash = (hash * 31 + seed.charCodeAt(offset)) >>> 0
  }
  return `legacy_${hash.toString(36)}`
}

export function parseTasksDocument(text: string): PendingTask[] {
  if (!text.trim()) throw new DriveDataError('The Drive sync file is empty or truncated.')

  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new DriveDataError('The Drive sync file contains invalid JSON.')
  }

  let candidates: unknown[]
  if (Array.isArray(parsed)) {
    candidates = parsed
  } else if (parsed && typeof parsed === 'object') {
    const wrapped = parsed as {
      schemaVersion?: unknown
      tasks?: unknown
      data?: { tasks?: unknown }
    }
    if (wrapped.schemaVersion !== undefined) {
      throw new DriveDataError('The Drive sync file uses an unsupported schema version.')
    }
    if (Array.isArray(wrapped.tasks)) candidates = wrapped.tasks
    else if (Array.isArray(wrapped.data?.tasks)) candidates = wrapped.data.tasks
    else throw new DriveDataError('The Drive sync file has an unsupported structure.')
  } else {
    throw new DriveDataError('The Drive sync file has an unsupported structure.')
  }

  const ids = new Set<string>()
  return candidates.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new DriveDataError(`Task ${index + 1} is not an object.`)
    }

    const raw = item as Record<string, unknown>
    const titleValue = typeof raw.title === 'string' ? raw.title : raw.name
    const title = typeof titleValue === 'string' ? titleValue.trim() : ''
    if (!title) throw new DriveDataError(`Task ${index + 1} has no title.`)

    const startDate = validDate(raw.startDate) ?? validDate(raw.date) ?? validDate(raw.createdAt)
    if (!startDate) throw new DriveDataError(`Task ${index + 1} has no valid start date.`)

    const createdAt =
      validTimestamp(raw.createdAt) ??
      validTimestamp(raw.created) ??
      `${startDate}T00:00:00.000Z`
    const updatedAt = validTimestamp(raw.updatedAt) ?? createdAt
    const id =
      typeof raw.id === 'string' && raw.id.trim()
        ? raw.id
        : fallbackId(title, startDate, createdAt, index)

    if (ids.has(id)) throw new DriveDataError(`The Drive sync file contains duplicate task ID ${id}.`)
    ids.add(id)

    const completedValue = raw.completedDate ?? raw.completedAt ?? raw.doneDate
    const completedDate = completedValue === undefined ? undefined : validDate(completedValue)
    if (completedValue !== undefined && !completedDate) {
      throw new DriveDataError(`Task ${index + 1} has an invalid completion date.`)
    }

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
    }
  })
}

function cloudTasks(tasks: PendingTask[]): Omit<PendingTask, 'synced'>[] {
  return tasks.map((task) => {
    const cloudTask: Partial<PendingTask> = { ...task }
    delete cloudTask.synced
    return cloudTask as Omit<PendingTask, 'synced'>
  })
}

function canonicalTasks(tasks: PendingTask[]): string {
  return JSON.stringify(
    cloudTasks(tasks)
      .slice()
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
      })),
  )
}

async function initializeFile(getToken: TokenProvider, file: DriveFileMeta): Promise<DriveFileMeta> {
  const uploadUrl =
    `https://www.googleapis.com/upload/drive/v3/files/${file.id}` +
    '?uploadType=media&fields=id,version,size,appProperties'
  const upload = await requireOk(await driveFetch(getToken, uploadUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: '[]',
  }))
  const uploaded = (await upload.json()) as DriveFileMeta

  const metadataUrl =
    `https://www.googleapis.com/drive/v3/files/${file.id}` +
    '?fields=id,version,size,appProperties'
  const metadata = await requireOk(await driveFetch(getToken, metadataUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appProperties: { app: 'ismailnow', purpose: 'primary-sync', initialization: 'ready' },
    }),
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
      if (existing.appProperties?.initialization === 'pending') {
        cachedFile = await initializeFile(getToken, existing)
      } else {
        cachedFile = existing
      }
      return cachedFile
    }

    const createUrl =
      'https://www.googleapis.com/drive/v3/files?fields=id,version,size,appProperties'
    const create = await requireOk(await driveFetch(getToken, createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: DRIVE_FILE_NAME,
        mimeType: 'application/json',
        appProperties: { app: 'ismailnow', purpose: 'primary-sync', initialization: 'pending' },
      }),
    }))
    const created = (await create.json()) as DriveFileMeta
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

async function readFile(getToken: TokenProvider, fileId: string): Promise<PendingTask[]> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
  const response = await requireOk(await driveFetch(getToken, url))
  return parseTasksDocument(await response.text())
}

export async function loadTasksFromDrive(getToken: TokenProvider): Promise<DriveTasksSnapshot> {
  let files = await listDriveDataFiles(getToken)
  if (files.length === 0) {
    const file = await getOrCreateDriveFile(getToken)
    files = [file]
  } else {
    files = await Promise.all(files.map((file) =>
      file.appProperties?.initialization === 'pending'
        ? initializeFile(getToken, file)
        : file,
    ))
  }

  const snapshots = await Promise.all(files.map(async (file) => ({
    file,
    tasks: await readFile(getToken, file.id),
  })))
  const byId = new Map<string, PendingTask>()
  for (const snapshot of snapshots) {
    for (const task of snapshot.tasks) {
      const existing = byId.get(task.id)
      if (!existing || task.updatedAt > existing.updatedAt) byId.set(task.id, task)
    }
  }

  cachedFile = snapshots[0].file
  return { file: snapshots[0].file, tasks: Array.from(byId.values()) }
}

async function getCurrentFile(
  getToken: TokenProvider,
  fileId: string,
): Promise<{ file: DriveFileMeta; etag: string | null }> {
  const url =
    `https://www.googleapis.com/drive/v3/files/${fileId}` +
    '?fields=id,version,size,appProperties'
  const response = await requireOk(await driveFetch(getToken, url))
  return {
    file: (await response.json()) as DriveFileMeta,
    etag: response.headers.get('etag'),
  }
}

export async function saveTasksToDrive(
  getToken: TokenProvider,
  tasks: PendingTask[],
  base: DriveFileMeta,
): Promise<DriveFileMeta> {
  const current = await getCurrentFile(getToken, base.id)
  if (current.file.version !== base.version) throw new DriveConflictError()

  // Drive v3 does not guarantee a browser-visible ETag. When it is unavailable,
  // the version check plus read-back verification is best-effort rather than CAS.
  const url =
    `https://www.googleapis.com/upload/drive/v3/files/${base.id}` +
    '?uploadType=media&fields=id,version,size,appProperties'
  const response = await driveFetch(getToken, url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(current.etag ? { 'If-Match': current.etag } : {}),
    },
    body: JSON.stringify(cloudTasks(tasks)),
  })
  if (response.status === 412) throw new DriveConflictError()
  await requireOk(response)
  const updated = (await response.json()) as DriveFileMeta

  const verified = await readFile(getToken, base.id)
  if (canonicalTasks(verified) !== canonicalTasks(tasks)) {
    throw new DriveConflictError('The Drive write was replaced before it could be verified.')
  }

  cachedFile = updated
  return updated
}

export function clearDriveCache(): void {
  cachedFile = null
  resolveFilePromise = null
}
