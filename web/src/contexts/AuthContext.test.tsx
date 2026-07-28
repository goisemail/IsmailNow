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
})
