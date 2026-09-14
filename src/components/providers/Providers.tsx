'use client'
import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { WalletProvider } from '@/components/wallet/WalletProvider'
import { SessionProvider } from '@/lib/auth/use-session'

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: 1 } } }))
  return (
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <WalletProvider>
          <SessionProvider>
            {children}
            <Toaster position="bottom-right" toastOptions={{ style: { fontSize: 13, borderRadius: 12, background: 'rgb(var(--surface))', color: 'rgb(var(--ink))', border: '1px solid var(--border-strong)' } }} />
          </SessionProvider>
        </WalletProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
