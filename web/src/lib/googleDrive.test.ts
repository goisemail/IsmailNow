import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearDriveCache,
  DriveConflictError,
  DriveDataError,
  DriveAuthorizationError,
  getOrCreateDriveFile,
  loadTasksFromDrive,
  parseTasksDocument,
  parseSyncDocument,
  saveTasksToDrive,
  type TokenProvider,
} from './googleDrive'
import type { PendingTask } from '../store/tasks'

const getToken: TokenProvider = vi.fn(async () => 'token')

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

describe('Drive document parsing', () => {
  it('accepts a valid empty legacy document', () => {
    expect(parseTasksDocument('[]')).toEqual([])
  })

  it.each(['', 'not json', '{}', '{"schemaVersion":99,"tasks":[]}'])(
    'rejects corrupt or unsupported content: %s',
    (content) => {
      expect(() => parseTasksDocument(content)).toThrow(DriveDataError)
    },
  )

  it('does not silently drop malformed tasks', () => {
    const content = JSON.stringify([
      {
        id: 'valid',
        title: 'Valid',
        startDate: '2026-07-28',
        createdAt: '2026-07-28T00:00:00.000Z',
        updatedAt: '2026-07-28T00:00:00.000Z',
      },
      { id: 'broken' },
    ])

    expect(() => parseTasksDocument(content)).toThrow('Task 2 has no title')
  })

  it('round-trips a versioned task and habit document', () => {
    const parsed = parseSyncDocument(JSON.stringify({
      schemaVersion: 2,
      updatedAt: '2026-07-29T00:00:00.000Z',
      tasks: [],
      habits: [{
        id: 'habit-1',
        name: 'Read',
        color: '#fff',
        progress: 0.5,
        streak: 3,
        createdAt: '2026-07-28T00:00:00.000Z',
        updatedAt: '2026-07-29T00:00:00.000Z',
      }],
    }))

    expect(parsed.habits).toMatchObject([{ id: 'habit-1', name: 'Read', synced: true }])
    expect(parsed.habitEntries).toEqual([])
  })
})

describe('Drive repository', () => {
  beforeEach(() => {
    clearDriveCache()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('creates metadata and uploads media without FormData', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ files: [] }))
      .mockResolvedValueOnce(jsonResponse({ id: 'file-1', version: '1' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'file-1', version: '2', size: '2' }))
      .mockResolvedValueOnce(jsonResponse({
        id: 'file-1',
        version: '3',
        size: '2',
        appProperties: { initialization: 'ready' },
      }))

    const file = await getOrCreateDriveFile(getToken)

    expect(file.id).toBe('file-1')
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls[1][0]).toContain('/drive/v3/files?fields=')
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST' })
    expect(fetchMock.mock.calls[2][0]).toContain('uploadType=media')
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: 'PATCH' })
    expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toMatchObject({
      schemaVersion: 3,
      tasks: [],
      habits: [],
      habitEntries: [],
    })
    expect(fetchMock.mock.calls[1][1]?.body).not.toBeInstanceOf(FormData)
  })

  it('blocks synchronization when remote JSON is corrupt', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ files: [{ id: 'file-1', version: '1' }] }))
      .mockResolvedValueOnce(new Response('{broken', { status: 200 }))

    await expect(loadTasksFromDrive(getToken)).rejects.toBeInstanceOf(DriveDataError)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls.every(([, init]) => init?.method !== 'PATCH')).toBe(true)
  })

  it('detects a version change before uploading', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'file-1', version: '2' }))

    await expect(saveTasksToDrive(getToken, [], { id: 'file-1', version: '1' }))
      .rejects.toBeInstanceOf(DriveConflictError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries one unauthorized Drive request with a fresh token', async () => {
    const provider = vi.fn(async (forceRefresh = false) => forceRefresh ? 'fresh' : 'expired')
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ files: [{ id: 'file-1', version: '1' }] }))
      .mockResolvedValueOnce(new Response('[]', { status: 200 }))

    await expect(loadTasksFromDrive(provider)).resolves.toMatchObject({ tasks: [] })
    expect(provider).toHaveBeenNthCalledWith(1, false)
    expect(provider).toHaveBeenNthCalledWith(2, true)
  })

  it('stops after a second unauthorized response', async () => {
    const provider = vi.fn(async () => 'token')
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response('still unauthorized', { status: 401 }))

    await expect(loadTasksFromDrive(provider)).rejects.toBeInstanceOf(DriveAuthorizationError)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(provider).toHaveBeenCalledTimes(2)
  })

  it('paginates discovery and reports duplicate files', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        nextPageToken: 'page-2',
        files: [{ id: 'file-1', version: '1', appProperties: { purpose: 'primary-sync' } }],
      }))
      .mockResolvedValueOnce(jsonResponse({
        files: [{ id: 'file-2', version: '1', appProperties: { purpose: 'primary-sync' } }],
      }))
      .mockResolvedValueOnce(new Response('[]', { status: 200 }))
      .mockResolvedValueOnce(new Response('[]', { status: 200 }))

    const snapshot = await loadTasksFromDrive(getToken)

    expect(String(fetchMock.mock.calls[1][0])).toContain('pageToken=page-2')
    expect(snapshot.duplicateFileIds).toEqual(['file-2'])
  })

  it('verifies uploaded task content', async () => {
    const task: PendingTask = {
      id: 'task-1',
      title: 'Task',
      startDate: '2026-07-28',
      createdAt: '2026-07-28T00:00:00.000Z',
      updatedAt: '2026-07-28T00:00:00.000Z',
      synced: true,
    }
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: 'file-1', version: '1' }, 200, { ETag: 'one' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'file-1', version: '2' }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ ...task, synced: undefined }]), { status: 200 }))
      .mockResolvedValueOnce(jsonResponse({ id: 'file-1', version: '3' }))

    await expect(saveTasksToDrive(getToken, [task], { id: 'file-1', version: '1' }))
      .resolves.toMatchObject({ version: '2' })
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ 'If-Match': 'one' })
  })
})
