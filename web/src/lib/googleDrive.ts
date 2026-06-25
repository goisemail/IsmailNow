/**
 * googleDrive.ts
 *
 * Stores the full task list as a single JSON file in the user's Google Drive.
 * Uses the Drive REST API v3 directly from the browser with the OAuth
 * access token obtained via Google Sign-In.
 *
 * The file is named 'ismailnow_data.json' and contains the complete
 * PendingTask array. It is written in bulk on a configurable interval
 * (see useDriveSync hook) rather than per-operation.
 */

import type { PendingTask } from '../store/tasks'

const DRIVE_FILE_NAME = 'ismailnow_data.json'
const FILE_ID_KEY = 'ismailnow_drive_file_id'
let resolveFilePromise: Promise<string> | null = null

interface DriveFileMeta {
  id: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeader(token: string): string {
  return 'Bearer ' + token
}

async function listDriveDataFiles(token: string): Promise<DriveFileMeta[]> {
  const searchUrl =
    'https://www.googleapis.com/drive/v3/files?q=' +
    encodeURIComponent(
      "name='" + DRIVE_FILE_NAME + "' and mimeType='application/json' and trashed=false",
    ) +
    '&fields=files(id)&orderBy=createdTime asc'

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: authHeader(token) },
  })
  if (!searchRes.ok) {
    const text = await searchRes.text()
    throw new Error('Drive API error ' + searchRes.status + ': ' + text)
  }
  const searchJson = (await searchRes.json()) as { files?: DriveFileMeta[] }
  return searchJson.files ?? []
}

function parseTasksArray(text: string): PendingTask[] {
  if (!text.trim()) return []
  try {
    const parsed = JSON.parse(text) as unknown
    let candidates: unknown[] = []
    if (Array.isArray(parsed)) {
      candidates = parsed
    } else if (parsed && typeof parsed === 'object') {
      const wrapped = parsed as { tasks?: unknown[]; data?: { tasks?: unknown[] } }
      if (Array.isArray(wrapped.tasks)) {
        candidates = wrapped.tasks
      } else if (Array.isArray(wrapped.data?.tasks)) {
        candidates = wrapped.data.tasks
      }
    }

    const normalizeDate = (value: unknown): string | undefined => {
      if (typeof value !== 'string') return undefined
      const ymd = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : value.slice(0, 10)
      return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : undefined
    }

    const fallbackId = (title: string, startDate: string, createdAt: string, index: number): string => {
      const seed = title + '|' + startDate + '|' + createdAt + '|' + index
      let hash = 0
      for (let i = 0; i < seed.length; i += 1) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
      }
      return 'legacy_' + hash.toString(36)
    }

    return candidates.flatMap((item, index) => {
      if (!item || typeof item !== 'object') return []

      const raw = item as Record<string, unknown>
      const title = typeof raw.title === 'string'
        ? raw.title
        : (typeof raw.name === 'string' ? raw.name : undefined)
      if (!title) return []

      const createdAt =
        typeof raw.createdAt === 'string'
          ? raw.createdAt
          : (
              typeof raw.created === 'string'
                ? raw.created
                : new Date().toISOString()
            )

      const startDate =
        normalizeDate(raw.startDate) ??
        normalizeDate(raw.date) ??
        normalizeDate(createdAt) ??
        new Date().toISOString().slice(0, 10)

      const completedDate =
        normalizeDate(raw.completedDate) ??
        normalizeDate(raw.completedAt) ??
        normalizeDate(raw.doneDate)

      const normalized: PendingTask = {
        id:
          typeof raw.id === 'string' && raw.id.trim().length > 0
            ? raw.id
            : fallbackId(title, startDate, createdAt, index),
        title,
        startDate,
        createdAt: typeof createdAt === 'string' ? createdAt : new Date().toISOString(),
        synced: true,
      }

      if (typeof raw.backgroundColor === 'string') normalized.backgroundColor = raw.backgroundColor
      if (completedDate) normalized.completedDate = completedDate

      return [normalized]
    })
  } catch {
    return []
  }
}

// ─── File bootstrap ───────────────────────────────────────────────────────────

/**
 * Returns the Drive file ID for this user's ismailnow_data.json.
 * Searches Drive for an existing file on first call, creates it if missing,
 * and caches the ID in localStorage.
 */
export async function getOrCreateDriveFile(token: string): Promise<string> {
  if (resolveFilePromise) return resolveFilePromise

  resolveFilePromise = (async () => {
    const files = await listDriveDataFiles(token)
    if (files.length > 0) {
      const id = files[0].id
      localStorage.setItem(FILE_ID_KEY, id)
      return id
    }

    // Create a new file in Drive with an empty task array
    const metadata = { name: DRIVE_FILE_NAME, mimeType: 'application/json' }
    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    form.append('file', new Blob([JSON.stringify([])], { type: 'application/json' }))

    const createRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      {
        method: 'POST',
        headers: { Authorization: authHeader(token) },
        body: form,
      },
    )
    if (!createRes.ok) {
      const text = await createRes.text()
      throw new Error('Drive API error ' + createRes.status + ': ' + text)
    }
    const created = (await createRes.json()) as { id: string }
    localStorage.setItem(FILE_ID_KEY, created.id)
    return created.id
  })()

  try {
    return await resolveFilePromise
  } finally {
    resolveFilePromise = null
  }
}

// ─── Read / write ─────────────────────────────────────────────────────────────

/**
 * Download and parse the task list from Drive.
 * Returns an empty array if the file is missing or its content is invalid.
 */
export async function loadTasksFromDrive(token: string): Promise<PendingTask[]> {
  let files = await listDriveDataFiles(token)
  if (files.length === 0) {
    clearDriveCache()
    await getOrCreateDriveFile(token)
    files = await listDriveDataFiles(token)
  }
  if (files.length === 0) return []

  localStorage.setItem(FILE_ID_KEY, files[0].id)

  const snapshots = await Promise.all(
    files.map(async ({ id }) => {
      const res = await fetch(
        'https://www.googleapis.com/drive/v3/files/' + id + '?alt=media',
        { headers: { Authorization: authHeader(token) } },
      )
      if (res.status === 404) return [] as PendingTask[]
      if (!res.ok) {
        const text = await res.text()
        throw new Error('Drive API error ' + res.status + ': ' + text)
      }
      const text = await res.text()
      return parseTasksArray(text)
    }),
  )

  const byId = new Map<string, PendingTask>()
  for (const tasks of snapshots) {
    for (const task of tasks) {
      byId.set(task.id, task)
    }
  }

  return Array.from(byId.values())
}

/**
 * Upload the complete task list to Drive, overwriting the existing file.
 */
export async function saveTasksToDrive(token: string, tasks: PendingTask[]): Promise<void> {
  const attemptWrite = async (): Promise<Response> => {
    const fileId = await getOrCreateDriveFile(token)
    return fetch(
      'https://www.googleapis.com/upload/drive/v3/files/' + fileId + '?uploadType=media',
      {
        method: 'PATCH',
        headers: {
          Authorization: authHeader(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tasks),
      },
    )
  }

  let res = await attemptWrite()
  if (res.status === 404) {
    clearDriveCache()
    res = await attemptWrite()
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error('Drive API error ' + res.status + ': ' + text)
  }
}

/**
 * Clear the cached Drive file ID (call on sign-out so the next sign-in
 * re-discovers or re-creates the file).
 */
export function clearDriveCache(): void {
  localStorage.removeItem(FILE_ID_KEY)
}
