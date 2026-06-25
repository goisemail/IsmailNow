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
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is PendingTask =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as PendingTask).id === 'string' &&
        typeof (item as PendingTask).title === 'string' &&
        typeof (item as PendingTask).startDate === 'string' &&
        typeof (item as PendingTask).createdAt === 'string',
    )
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
