'use client'
import * as React from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { api } from '@/lib/utils/fetcher'

/**
 * Client session state. Sign-in = wallet signature over a server-issued
 * nonce; the server sets an httpOnly cookie. Components read `session` and
 * never send the address as a trusted value.
 */
export interface ClientSession {
  authenticated: boolean
  address?: `0x${string}`
  userId?: string
  isAdmin?: boolean
  expiresAt?: string
}

interface SessionCtx {
  session: ClientSession
  loading: boolean
  signingIn: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const Ctx = React.createContext<SessionCtx>({ session: { authenticated: false }, loading: true, signingIn: false, error: null, signIn: async () => undefined, signOut: async () => undefined, refresh: async () => undefined })

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<ClientSession>({ authenticated: false })
  const [loading, setLoading] = React.useState(true)
  const [signingIn, setSigningIn] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const refresh = React.useCallback(async () => {
    try {
      const s = await api<ClientSession>('/api/auth/session')
      setSession(s)
    } catch {
      setSession({ authenticated: false })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const signIn = React.useCallback(async () => {
    if (!address) {
      setError('Connect a wallet first.')
      return
    }
    setSigningIn(true)
    setError(null)
    try {
      const { message } = await api<{ message: string }>('/api/auth/nonce', { method: 'POST', json: { address } })
      const signature = await signMessageAsync({ message })
      const s = await api<{ address: `0x${string}`; userId: string; isAdmin: boolean; expiresAt: string }>('/api/auth/verify', { method: 'POST', json: { address, message, signature } })
      setSession({ authenticated: true, ...s })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.')
    } finally {
      setSigningIn(false)
    }
  }, [address, signMessageAsync])

  const signOut = React.useCallback(async () => {
    await api('/api/auth/session', { method: 'DELETE' }).catch(() => undefined)
    setSession({ authenticated: false })
  }, [])

  // A session for a different wallet than the connected one is not usable.
  const effective = React.useMemo<ClientSession>(() => {
    if (session.authenticated && address && session.address && session.address.toLowerCase() !== address.toLowerCase()) return { authenticated: false }
    return session
  }, [session, address])

  const value = React.useMemo(() => ({ session: effective, loading, signingIn, error, signIn, signOut, refresh }), [effective, loading, signingIn, error, signIn, signOut, refresh])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useSession = () => React.useContext(Ctx)
