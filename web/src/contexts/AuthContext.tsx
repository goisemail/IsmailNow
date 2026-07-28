import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { accountOwnerId, migrateLegacyStorage } from '../lib/accountStorage'
import { clearDriveCache, type TokenProvider } from '../lib/googleDrive'
import { useHabitsStore } from '../store/habits'
import { useTasksStore } from '../store/tasks'

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

        persistAndActivateAccount(newUser)
        tokenRef.current = { ...requestedToken, ownerUid: newUser.uid }
        setReauthRequired(false)
        setUser(newUser)
      } catch (error) {
        if (generation !== authGenerationRef.current) return
        setAuthError(error instanceof Error ? error.message : 'Google sign-in failed.')
      }
    })()
  }

  const signInGuest = () => {
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
