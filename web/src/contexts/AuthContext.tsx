import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { clearDriveCache } from '../lib/googleDrive'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppUser {
  uid: string        // Google sub (unique user id)
  email?: string
  name: string
  photoUrl?: string
  accessToken?: string
  isGuest?: boolean
}

interface AuthContextValue {
  user: AppUser | null
  loading: boolean
  signIn: () => void
  signInGuest: () => void
  signOut: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const USER_KEY = 'ismailnow_user'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

// Google OAuth scopes:
//   openid + email + profile   → basic identity
//   drive.file                 → read/write only files this app created
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.file',
].join(' ')

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(USER_KEY)
      if (stored) {
        setUser(JSON.parse(stored) as AppUser)
      }
    } catch {
      // Corrupted storage — ignore
    }
    setLoading(false)
  }, [])

  /**
   * Opens Google's OAuth2 popup. On success, parses the id_token and
   * access_token, stores the user in localStorage, and updates state.
   *
   * Uses the Google Identity Services (GIS) library loaded via a <script>
   * tag in index.html.
   */
  const signIn = () => {
    if (!CLIENT_ID) {
      alert(
        'Google Client ID is not configured.\n' +
          'Set VITE_GOOGLE_CLIENT_ID in your .env file.',
      )
      return
    }

    // google.accounts.oauth2 is loaded from the GIS script in index.html
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (tokenResponse: any) => {
        if (tokenResponse.error) {
          console.error('Google sign-in error:', tokenResponse.error)
          return
        }

        const accessToken: string = tokenResponse.access_token

        // Fetch basic profile from Google's userinfo endpoint
        const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: 'Bearer ' + accessToken },
        })
        const profile = (await profileRes.json()) as {
          sub: string
          email: string
          name: string
          picture: string
        }

        const newUser: AppUser = {
          uid: profile.sub,
          email: profile.email,
          name: profile.name,
          photoUrl: profile.picture,
          accessToken,
          isGuest: false,
        }

        localStorage.setItem(USER_KEY, JSON.stringify(newUser))
        setUser(newUser)
      },
    })

    client.requestAccessToken()
  }

  const signInGuest = () => {
    const guest: AppUser = {
      uid: 'guest',
      name: 'Guest',
      isGuest: true,
    }
    localStorage.setItem(USER_KEY, JSON.stringify(guest))
    clearDriveCache()
    setUser(guest)
  }

  const signOut = () => {
    localStorage.removeItem(USER_KEY)
    clearDriveCache()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signInGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
