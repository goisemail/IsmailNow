import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accountStorageKey } from '../lib/accountStorage'
import { useAuth, AuthProvider } from './AuthContext'
import { useTasksStore } from '../store/tasks'
import { useHabitsStore } from '../store/habits'

function AuthProbe() {
  const {
    user,
    authError,
    reauthRequired,
    signIn,
    signInGuest,
    signOut,
    getAccessToken,
  } = useAuth()
  return (
    <div>
      <span data-testid="user">{user?.uid ?? 'none'}</span>
      <span data-testid="error">{authError ?? ''}</span>
      <span data-testid="reauth">{reauthRequired ? 'required' : ''}</span>
      <button onClick={signIn}>Sign in</button>
      <button onClick={signInGuest}>Use guest</button>
      <button onClick={() => void signOut()}>Sign out</button>
      <button onClick={() => void getAccessToken().catch(() => undefined)}>Authorize Drive</button>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    useTasksStore.getState().clearMemory()
    useHabitsStore.getState().clearMemory()
    window.google = undefined
    vi.stubGlobal('fetch', vi.fn())
  })

  it('scrubs a legacy persisted access token and scopes existing local data', async () => {
    localStorage.setItem('ismailnow_user', JSON.stringify({
      uid: 'user-1',
      name: 'User',
      accessToken: 'secret',
    }))
    localStorage.setItem('ismailnow_tasks_v1', JSON.stringify([]))

    render(<AuthProvider><AuthProbe /></AuthProvider>)

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('user-1'))
    expect(localStorage.getItem('ismailnow_user')).not.toContain('secret')
    expect(localStorage.getItem(accountStorageKey('google:user-1', 'tasks'))).toBe('[]')
    expect(localStorage.getItem('ismailnow_tasks_v1')).toBeNull()
  })

  it('persists only a validated profile after Google sign-in', async () => {
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: (config) => ({
            requestAccessToken: () => config.callback({ access_token: 'secret', expires_in: 3600 }),
          }),
          revoke: vi.fn(),
        },
      },
    }
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      sub: 'user-2',
      name: 'Valid User',
      email: 'user@example.com',
    }), { status: 200 }))

    render(<AuthProvider><AuthProbe /></AuthProvider>)
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('user-2'))
    expect(localStorage.getItem('ismailnow_user')).toBe(JSON.stringify({
      uid: 'user-2',
      name: 'Valid User',
      email: 'user@example.com',
    }))
  })

  it('does not replace local account state when profile validation fails', async () => {
    localStorage.setItem('ismailnow_user', JSON.stringify({ uid: 'guest', name: 'Guest', isGuest: true }))
    localStorage.setItem(accountStorageKey('guest:local', 'tasks'), JSON.stringify([]))
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: (config) => ({
            requestAccessToken: () => config.callback({ access_token: 'secret', expires_in: 3600 }),
          }),
          revoke: vi.fn(),
        },
      },
    }
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ name: 'Missing ID' }), { status: 200 }))

    render(<AuthProvider><AuthProbe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('guest'))
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('account ID'))
    expect(screen.getByTestId('user')).toHaveTextContent('guest')
    expect(localStorage.getItem(accountStorageKey('guest:local', 'tasks'))).toBe('[]')
  })

  it('retains pending account data when logging out offline', async () => {
    const storageKey = accountStorageKey('google:user-3', 'tasks')
    localStorage.setItem('ismailnow_user', JSON.stringify({ uid: 'user-3', name: 'Offline User' }))
    localStorage.setItem(storageKey, JSON.stringify([{
      id: 'pending',
      title: 'Pending',
      startDate: '2026-07-28',
      createdAt: '2026-07-28T00:00:00.000Z',
      updatedAt: '2026-07-28T00:00:00.000Z',
      synced: false,
    }]))
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })

    render(<AuthProvider><AuthProbe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('user-3'))
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('none'))
    expect(JSON.parse(localStorage.getItem(storageKey) ?? '[]')).toHaveLength(1)
  })

  it('ignores a delayed Google callback after guest mode is selected', async () => {
    let tokenCallback: ((response: GoogleTokenResponse) => void) | undefined
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: (config) => {
            tokenCallback = config.callback
            return { requestAccessToken: vi.fn() }
          },
          revoke: vi.fn(),
        },
      },
    }

    render(<AuthProvider><AuthProbe /></AuthProvider>)
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await userEvent.click(screen.getByRole('button', { name: 'Use guest' }))
    tokenCallback?.({ access_token: 'late-token', expires_in: 3600 })

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('guest'))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects a refreshed token that belongs to another Google account', async () => {
    localStorage.setItem('ismailnow_user', JSON.stringify({ uid: 'user-a', name: 'User A' }))
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: (config) => ({
            requestAccessToken: () => config.callback({ access_token: 'user-b-token', expires_in: 3600 }),
          }),
          revoke: vi.fn(),
        },
      },
    }
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      sub: 'user-b',
      name: 'User B',
    }), { status: 200 }))

    render(<AuthProvider><AuthProbe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('user-a'))
    await userEvent.click(screen.getByRole('button', { name: 'Authorize Drive' }))

    await waitFor(() => expect(screen.getByTestId('reauth')).toHaveTextContent('required'))
    expect(screen.getByTestId('user')).toHaveTextContent('user-a')
  })

  it('merges guest tasks into the selected Google namespace', async () => {
    localStorage.setItem('ismailnow_user', JSON.stringify({ uid: 'guest', name: 'Guest', isGuest: true }))
    localStorage.setItem(accountStorageKey('guest:local', 'tasks'), JSON.stringify([{
      id: 'guest-task',
      title: 'Guest task',
      startDate: '2026-07-29',
      createdAt: '2026-07-29T00:00:00.000Z',
      updatedAt: '2026-07-29T00:00:00.000Z',
      synced: false,
    }]))
    vi.spyOn(window, 'prompt').mockReturnValue('MERGE')
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: (config) => ({
            requestAccessToken: () => config.callback({ access_token: 'token', expires_in: 3600 }),
          }),
          revoke: vi.fn(),
        },
      },
    }
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      sub: 'google-user',
      name: 'Google User',
    }), { status: 200 }))

    render(<AuthProvider><AuthProbe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('guest'))
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('google-user'))

    const merged = JSON.parse(
      localStorage.getItem(accountStorageKey('google:google-user', 'tasks')) ?? '[]',
    ) as Array<{ id: string }>
    expect(merged.map((task) => task.id)).toContain('guest-task')
    expect(localStorage.getItem(accountStorageKey('guest:local', 'tasks'))).not.toBeNull()
  })

  it('blocks offline logout when changes exist only in memory', async () => {
    localStorage.setItem('ismailnow_user', JSON.stringify({ uid: 'user-volatile', name: 'User' }))
    render(<AuthProvider><AuthProbe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('user-volatile'))

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    vi.spyOn(window, 'prompt').mockReturnValue('CANCEL')
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    await useTasksStore.getState().addTask('Unsaved', '2026-07-29')
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(screen.getByTestId('user')).toHaveTextContent('user-volatile')
    expect(useTasksStore.getState().tasks).toHaveLength(1)
  })

  it('keeps the session when an online logout flush fails and the user cancels', async () => {
    localStorage.setItem('ismailnow_user', JSON.stringify({ uid: 'user-online', name: 'User' }))
    localStorage.setItem(accountStorageKey('google:user-online', 'tasks'), JSON.stringify([{
      id: 'pending',
      title: 'Pending',
      startDate: '2026-07-29',
      createdAt: '2026-07-29T00:00:00.000Z',
      updatedAt: '2026-07-29T00:00:00.000Z',
      synced: false,
    }]))
    render(<AuthProvider><AuthProbe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('user-online'))
    vi.spyOn(useTasksStore.getState(), 'flushToDrive').mockRejectedValue(new Error('failed'))
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(screen.getByTestId('user')).toHaveTextContent('user-online')
    expect(localStorage.getItem('ismailnow_user')).not.toBeNull()
  })

  it('requests a fresh token after the expiry skew boundary', async () => {
    let now = 1_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    let tokenNumber = 0
    const initTokenClient = vi.fn((config: Parameters<NonNullable<Window['google']>['accounts']['oauth2']['initTokenClient']>[0]) => ({
      requestAccessToken: () => {
        tokenNumber += 1
        config.callback({ access_token: `token-${tokenNumber}`, expires_in: 3600 })
      },
    }))
    window.google = {
      accounts: { oauth2: { initTokenClient, revoke: vi.fn() } },
    }
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ sub: 'expiring', name: 'User' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sub: 'expiring', name: 'User' }), { status: 200 }))

    render(<AuthProvider><AuthProbe /></AuthProvider>)
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('expiring'))
    await userEvent.click(screen.getByRole('button', { name: 'Authorize Drive' }))
    expect(initTokenClient).toHaveBeenCalledTimes(1)

    now += 3_600_000 - 59_000
    await userEvent.click(screen.getByRole('button', { name: 'Authorize Drive' }))
    await waitFor(() => expect(initTokenClient).toHaveBeenCalledTimes(2))
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('enters reauthorization state when Drive reports terminal authorization failure', async () => {
    localStorage.setItem('ismailnow_user', JSON.stringify({ uid: 'reauth-user', name: 'User' }))
    render(<AuthProvider><AuthProbe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('reauth-user'))

    window.dispatchEvent(new Event('ismailnow:reauth-required'))

    await waitFor(() => expect(screen.getByTestId('reauth')).toHaveTextContent('required'))
  })
})
