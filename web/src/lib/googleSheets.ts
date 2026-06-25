/**
 * googleSheets.ts
 *
 * All interaction with the user's own Google Sheet (stored in their Drive).
 * Uses the Google Sheets REST API v4 directly from the browser with the
 * OAuth access token obtained via Google Sign-In.
 *
 * Sheet columns:
 *   A: id           – unique task id
 *   B: title        – task name
 *   C: startDate    – YYYY-MM-DD
 *   D: createdAt    – ISO datetime
 *   E: completedDate – YYYY-MM-DD or empty string
 */

const SHEET_NAME = 'IsmailNow Tasks'
const SHEET_ID_KEY = 'ismailnow_sheet_id'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SheetTask {
  id: string
  title: string
  startDate: string
  createdAt: string
  completedDate: string // empty string means not completed
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function authHeader(token: string): string {
  return 'Bearer ' + token
}

function sheetsBaseUrl(sheetId: string, range: string): string {
  return (
    'https://sheets.googleapis.com/v4/spreadsheets/' +
    sheetId +
    '/values/' +
    encodeURIComponent(range)
  )
}

async function sheetsRequest<T>(
  url: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: authHeader(token),
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error('Sheets API error ' + res.status + ': ' + text)
  }
  return res.json() as Promise<T>
}

// ─── Sheet bootstrap ──────────────────────────────────────────────────────────

/**
 * Returns the spreadsheet ID for this user's IsmailNow sheet.
 * Creates the sheet on first call and caches the ID in localStorage.
 */
export async function getOrCreateSheet(token: string): Promise<string> {
  const cached = localStorage.getItem(SHEET_ID_KEY)
  if (cached) return cached

  // Search Drive for an existing sheet with this name
  const searchUrl =
    'https://www.googleapis.com/drive/v3/files?q=' +
    encodeURIComponent(
      "name='" + SHEET_NAME + "' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    ) +
    '&fields=files(id,name)'

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: authHeader(token) },
  })
  const searchJson = (await searchRes.json()) as { files: { id: string; name: string }[] }

  if (searchJson.files && searchJson.files.length > 0) {
    const id = searchJson.files[0].id
    localStorage.setItem(SHEET_ID_KEY, id)
    return id
  }

  // Create a new spreadsheet in the user's Drive
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: authHeader(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: SHEET_NAME },
      sheets: [
        {
          properties: { title: 'Tasks' },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: ['id', 'title', 'startDate', 'createdAt', 'completedDate'].map(
                    (v) => ({ userEnteredValue: { stringValue: v } }),
                  ),
                },
              ],
            },
          ],
        },
      ],
    }),
  })
  const created = (await createRes.json()) as { spreadsheetId: string }
  const newId = created.spreadsheetId
  localStorage.setItem(SHEET_ID_KEY, newId)
  return newId
}

// ─── CRUD operations ──────────────────────────────────────────────────────────

/**
 * Fetch all tasks from the sheet, filtered for the given date.
 * A task is visible on `date` if:
 *   task.startDate <= date  AND  (completedDate === '' OR completedDate > date)
 */
export async function fetchTasksForDate(token: string, date: string): Promise<SheetTask[]> {
  const sheetId = await getOrCreateSheet(token)
  const data = await sheetsRequest<{ values?: string[][] }>(
    sheetsBaseUrl(sheetId, 'Tasks!A2:E'),
    token,
  )

  const rows = data.values ?? []
  const all: SheetTask[] = rows.map((row) => ({
    id: row[0] ?? '',
    title: row[1] ?? '',
    startDate: row[2] ?? '',
    createdAt: row[3] ?? '',
    completedDate: row[4] ?? '',
  }))

  return all.filter(
    (t) =>
      t.id !== '' &&
      t.startDate <= date &&
      (t.completedDate === '' || t.completedDate > date),
  )
}

/**
 * Append a new task row to the sheet.
 */
export async function appendTask(token: string, task: SheetTask): Promise<void> {
  const sheetId = await getOrCreateSheet(token)
  const url =
    sheetsBaseUrl(sheetId, 'Tasks!A:E') +
    '?valueInputOption=RAW&insertDataOption=INSERT_ROWS'
  await sheetsRequest(url, token, {
    method: 'POST',
    body: JSON.stringify({
      values: [[task.id, task.title, task.startDate, task.createdAt, task.completedDate]],
    }),
  })
}

/**
 * Mark a task complete by updating column E for the matching row.
 */
export async function markTaskComplete(
  token: string,
  taskId: string,
  completedDate: string,
): Promise<void> {
  const sheetId = await getOrCreateSheet(token)

  const data = await sheetsRequest<{ values?: string[][] }>(
    sheetsBaseUrl(sheetId, 'Tasks!A:A'),
    token,
  )
  const rows = data.values ?? []
  const rowIndex = rows.findIndex((r) => r[0] === taskId)
  if (rowIndex === -1) return // not yet synced to sheet

  const sheetRow = rowIndex + 1 // 1-indexed; row 1 is header
  await sheetsRequest(
    sheetsBaseUrl(sheetId, 'Tasks!E' + sheetRow) + '?valueInputOption=RAW',
    token,
    {
      method: 'PUT',
      body: JSON.stringify({ values: [[completedDate]] }),
    },
  )
}

/**
 * Clear the cached sheet ID (call on sign-out).
 */
export function clearSheetCache(): void {
  localStorage.removeItem(SHEET_ID_KEY)
}
