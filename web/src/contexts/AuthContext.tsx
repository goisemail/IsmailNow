import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { accountOwnerId, accountStorageKey, migrateLegacyStorage } from '../lib/accountStorage'
import { clearDriveCache, type TokenProvider } from '../lib/googleDrive'
import { mergeHabits, useHabitsStore, type Habit } from '../store/habits'
import { mergeTasks, useTasksStore, type PendingTask } from '../store/tasks'

export interface AppUser {
  uid: string
  email?: string
  name: string
  photoUrl?: string
  isGuest?: boolean
}

interface TokenState {
  accessToken: string
  expiresAt: number
  ownerUid?: string
}

interface GoogleProfile {
  sub: string
  name: string
  email?: string
  picture?: string
}

interface AuthContextValue {
  user: AppUser | null
  loading: boolean
  authError: string | null
  reauthRequired: boolean
  canSync: boolean
  signIn: () => void
  signInGuest: () => void
  signOut: () => Promise<boolean>
  reauthorize: () => Promise<boolean>
  getAccessToken: TokenProvider
}

const USER_KEY = 'ismailnow_user'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
const TOKEN_EXPIRY_SKEW_MS = 60_000
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.file',
].join(' ')

const AuthContext = createContext<AuthContextValue | null>(null)

function parseStoredUser(value: string): AppUser | null {
  const parsed = JSON.parse(value) as Record<string, unknown>
  if (typeof parsed.uid !== 'string' || !parsed.uid.trim()) return null
  if (typeof parsed.name !== 'string' || !parsed.name.trim()) return null

  return {
    uid: parsed.uid,
    name: parsed.name,
    ...(typeof parsed.email === 'string' ? { email: parsed.email } : {}),
    ...(typeof parsed.photoUrl === 'string' ? { photoUrl: parsed.photoUrl } : {}),
    ...(parsed.isGuest === true ? { isGuest: true } : {}),
  }
}

function activateLocalAccount(profile: AppUser): void {
  const ownerId = accountOwnerId(profile.uid, profile.isGuest)
  clearDriveCache()
  migrateLegacyStorage(ownerId)
  useTasksStore.getState().load(ownerId)
  void useHabitsStore.getState().load(ownerId)
}

function clearActiveAccount(): void {
  useTasksStore.getState().clearMemory()
  useHabitsStore.getState().clearMemory()
  clearDriveCache()
}

function exportCurrentMemory(): void {
  const payload = JSON.stringify({
    exportedAt: new Date().toISOString(),
    tasks: useTasksStore.getState().tasks,
    habits: useHabitsStore.getState().habits,
  }, null, 2)
  const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `ismailnow-unsaved-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error(`Google profile request failed (${response.status}).`)

  const profile = (await response.json()) as Record<string, unknown>
  if (typeof profile.sub !== 'string' || !profile.sub.trim()) {
    throw new Error('Google profile response did not include an account ID.')
  }
  if (typeof profile.name !== 'string' || !profile.name.trim()) {
    throw new Error('Google profile response did not include a name.')
  }

  return {
    sub: profile.sub,
    name: profile.name,
    ...(typeof profile.email === 'string' ? { email: profile.email } : {}),
    ...(typeof profile.picture === 'string' ? { picture: profile.picture } : {}),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [reauthRequired, setReauthRequired] = useState(false)
  const tokenRef = useRef<TokenState | null>(null)
  const tokenRequestRef = useRef<Promise<TokenState> | null>(null)
  const authGenerationRef = useRef(0)
  const discardGuestAfterSwitchRef = useRef(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(USER_KEY)
      if (stored) {
        const profile = parseStoredUser(stored)
        if (profile) {
          localStorage.setItem(USER_KEY, JSON.stringify(profile))
          activateLocalAccount(profile)
          setUser(profile)
        } else {
          localStorage.removeItem(USER_KEY)
        }
      }
    } catch {
      setAuthError('The saved session could not be restored.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const requireReauthorization = () => {
      tokenRef.current = null
      setReauthRequired(true)
    }
    window.addEventListener('ismailnow:reauth-required', requireReauthorization)
    return () => window.removeEventListener('ismailnow:reauth-required', requireReauthorization)
  }, [])

  const requestAccessToken = useCallback((prompt = ''): Promise<TokenState> => {
    if (tokenRequestRef.current) return tokenRequestRef.current

    const request = new Promise<TokenState>((resolve, reject) => {
      if (!CLIENT_ID) {
        reject(new Error('Google Client ID is not configured.'))
        return
      }
      if (!window.google?.accounts.oauth2) {
        reject(new Error('Google sign-in is not available yet. Please try again.'))
        return
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.error || !response.access_token) {
            reject(new Error(response.error_description || response.error || 'Google authorization failed.'))
            return
          }

          const expiresIn = Number(response.expires_in)
          if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
            reject(new Error('Google returned an invalid token expiry.'))
            return
          }

          resolve({
            accessToken: response.access_token,
            expiresAt: Date.now() + expiresIn * 1000,
          })
        },
        error_callback: () => reject(new Error('The Google authorization window could not be opened.')),
      })

      client.requestAccessToken({ prompt })
    })

    const trackedRequest = request.finally(() => {
      if (tokenRequestRef.current === trackedRequest) tokenRequestRef.current = null
    })
    tokenRequestRef.current = trackedRequest
    return trackedRequest
  }, [])

  const getAccessToken = useCallback<TokenProvider>(async (forceRefresh = false) => {
    if (!user || user.isGuest) {
      throw new Error('Google Drive sync requires a Google account.')
    }

    const token = tokenRef.current
    if (
      !forceRefresh &&
      token?.ownerUid === user.uid &&
      token.expiresAt - TOKEN_EXPIRY_SKEW_MS > Date.now()
    ) {
      return token.accessToken
    }

    tokenRef.current = null
    const expectedUid = user.uid
    const generation = authGenerationRef.current
    try {
      const requestedToken = await requestAccessToken('')
      const profile = await fetchGoogleProfile(requestedToken.accessToken)
      if (generation !== authGenerationRef.current || profile.sub !== expectedUid) {
        throw new Error('Google authorization belongs to a different account. Please sign in again.')
      }
      tokenRef.current = { ...requestedToken, ownerUid: expectedUid }
      setReauthRequired(false)
      return requestedToken.accessToken
    } catch (error) {
      setReauthRequired(true)
      throw error
    }
  }, [requestAccessToken, user])

  const persistAndActivateAccount = (profile: AppUser): void => {
    const previousStoredUser = localStorage.getItem(USER_KEY)
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(profile))
      activateLocalAccount(profile)
    } catch (error) {
      try {
        if (previousStoredUser === null) localStorage.removeItem(USER_KEY)
        else localStorage.setItem(USER_KEY, previousStoredUser)
        if (user) activateLocalAccount(user)
        else clearActiveAccount()
      } catch {
        // Preserve the original storage error for the user-facing message.
      }
      throw error
    }
  }

  const allowVolatileTransition = (): boolean => {
    const tasks = useTasksStore.getState()
    const habits = useHabitsStore.getState()
    if (!tasks.hasVolatileChanges() && !habits.hasVolatileChanges()) return true

    const persisted = tasks.retryPersistence() && habits.retryPersistence()
    if (persisted) return true

    const choice = window.prompt(
      'Some changes exist only in memory. Type EXPORT to download them, DISCARD to continue and lose them, or CANCEL to stay here.',
      'CANCEL',
    )?.trim().toUpperCase()
    if (choice === 'EXPORT') {
      exportCurrentMemory()
      return false
    }
    if (choice === 'DISCARD') {
      return window.confirm('Discard changes that could not be saved? This cannot be undone.')
    }
    return false
  }

  const prepareGuestTransition = (profile: AppUser): boolean => {
    if (!user?.isGuest) return true
    const guestTasks = useTasksStore.getState().tasks
    const guestHabits = useHabitsStore.getState().habits
    if (guestTasks.length === 0 && guestHabits.length === 0) return true

    const choice = window.prompt(
      'Guest data found. Type MERGE to copy it to Google, KEEP to leave it separate, EXPORT to download it, or DISCARD to remove it.',
      'MERGE',
    )?.trim().toUpperCase()
    if (choice === 'EXPORT') {
      exportCurrentMemory()
      return false
    }
    if (choice === 'KEEP') {
      discardGuestAfterSwitchRef.current = false
      return true
    }
    if (choice === 'DISCARD') {
      if (!window.confirm('Permanently remove guest data from this device?')) return false
      discardGuestAfterSwitchRef.current = true
      return true
    }
    if (choice !== 'MERGE') return false

    try {
      const targetOwner = accountOwnerId(profile.uid)
      const targetTasks = JSON.parse(
        localStorage.getItem(accountStorageKey(targetOwner, 'tasks')) ?? '[]',
      ) as PendingTask[]
      const targetHabits = JSON.parse(
        localStorage.getItem(accountStorageKey(targetOwner, 'habits')) ?? '[]',
      ) as Habit[]
      const mergedTasks = mergeTasks(
        guestTasks.map((task) => ({ ...task, synced: false })),
        targetTasks,
      )
      const mergedHabits = mergeHabits(
        guestHabits.map((habit) => ({ ...habit, synced: false })),
        targetHabits,
      )
      localStorage.setItem(accountStorageKey(targetOwner, 'tasks'), JSON.stringify(mergedTasks))
      localStorage.setItem(accountStorageKey(targetOwner, 'habits'), JSON.stringify(mergedHabits))
      discardGuestAfterSwitchRef.current = false
      return true
    } catch {
      setAuthError('Guest data could not be copied. Nothing was removed; please retry or export it.')
      return false
    }
  }

  const signIn = () => {
    const generation = authGenerationRef.current + 1
    authGenerationRef.current = generation
    setAuthError(null)
    void (async () => {
      try {
        const requestedToken = await requestAccessToken('')
        if (generation !== authGenerationRef.current) return
        const profile = await fetchGoogleProfile(requestedToken.accessToken)
        if (generation !== authGenerationRef.current) return

        const newUser: AppUser = {
          uid: profile.sub,
          name: profile.name,
          ...(typeof profile.email === 'string' ? { email: profile.email } : {}),
          ...(typeof profile.picture === 'string' ? { photoUrl: profile.picture } : {}),
        }

        if (!allowVolatileTransition() || !prepareGuestTransition(newUser)) return
        persistAndActivateAccount(newUser)
        tokenRef.current = { ...requestedToken, ownerUid: newUser.uid }
        setReauthRequired(false)
        setUser(newUser)
        if (discardGuestAfterSwitchRef.current) {
          try {
            localStorage.removeItem(accountStorageKey('guest:local', 'tasks'))
            localStorage.removeItem(accountStorageKey('guest:local', 'habits'))
          } finally {
            discardGuestAfterSwitchRef.current = false
          }
        }
      } catch (error) {
        if (generation !== authGenerationRef.current) return
        setAuthError(error instanceof Error ? error.message : 'Google sign-in failed.')
      }
    })()
  }

  const signInGuest = () => {
    if (!allowVolatileTransition()) return
    authGenerationRef.current += 1
    tokenRef.current = null
    const guest: AppUser = { uid: 'guest', name: 'Guest', isGuest: true }
    try {
      persistAndActivateAccount(guest)
      setAuthError(null)
      setUser(guest)
    } catch {
      setAuthError('Guest mode could not be started because browser storage is unavailable.')
    }
  }

  const signOut = async (): Promise<boolean> => {
    if (!allowVolatileTransition()) return false
    authGenerationRef.current += 1
    if (user && !user.isGuest && useTasksStore.getState().hasPendingChanges() && navigator.onLine) {
      try {
        await useTasksStore.getState().flushToDrive(getAccessToken)
      } catch {
        const continueLogout = window.confirm(
          'Cloud sync failed. Your pending changes will remain on this device. Log out anyway?',
        )
        if (!continueLogout) return false
      }
    }

    try {
      localStorage.removeItem(USER_KEY)
    } catch {
      setAuthError('The local session could not be cleared. Please try again.')
      return false
    }

    const token = tokenRef.current?.accessToken
    if (token && window.google?.accounts.oauth2) {
      window.google.accounts.oauth2.revoke(token)
    }

    tokenRef.current = null
    tokenRequestRef.current = null
    clearActiveAccount()
    setUser(null)
    setReauthRequired(false)
    setAuthError(null)
    return true
  }

  const reauthorize = async (): Promise<boolean> => {
    if (!user || user.isGuest) return false
    const generation = authGenerationRef.current
    try {
      const requestedToken = await requestAccessToken('consent')
      const profile = await fetchGoogleProfile(requestedToken.accessToken)
      if (generation !== authGenerationRef.current || profile.sub !== user.uid) {
        throw new Error('Google authorization belongs to a different account.')
      }
      tokenRef.current = { ...requestedToken, ownerUid: user.uid }
      setReauthRequired(false)
      setAuthError(null)
      return true
    } catch (error) {
      setReauthRequired(true)
      setAuthError(error instanceof Error ? error.message : 'Google Drive reconnection failed.')
      return false
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        reauthRequired,
        canSync: Boolean(user && !user.isGuest),
        signIn,
        signInGuest,
        signOut,
        reauthorize,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
