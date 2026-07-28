interface GoogleTokenResponse {
  access_token?: string
  expires_in?: number | string
  error?: string
  error_description?: string
}

interface GoogleTokenClient {
  requestAccessToken(options?: { prompt?: string }): void
}

interface Window {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient(config: {
          client_id: string
          scope: string
          callback: (response: GoogleTokenResponse) => void
          error_callback?: (error: unknown) => void
        }): GoogleTokenClient
        revoke(token: string, callback?: () => void): void
      }
    }
  }
}
