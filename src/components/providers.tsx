'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ToastContainer } from '@/components/shared/Toast'
import { I18nProvider } from '@/i18n/I18nContext'
import { AuthProvider, useAuth } from '@/lib/contexts/AuthContext'
import { ApiError } from '@/lib/api/problem'

interface ProvidersProps {
  children: ReactNode
}

/** Retry only when the request never reached the server; a 4xx/5xx answer is final. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  return error instanceof ApiError && error.status === 0 && failureCount < 2
}

const SESSION_EXPIRED = 'gecko:session-expired'

/** The client already refreshed once and retried: a 401 that reaches React Query means the session is gone. */
function onApiError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) window.dispatchEvent(new Event(SESSION_EXPIRED))
}

/** React Query lives INSIDE AuthProvider so a dead session can clear the cache and sign out. */
function QueryProvider({ children }: { children: ReactNode }) {
  const { expireSession } = useAuth()

  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: onApiError }),
        mutationCache: new MutationCache({ onError: onApiError }),
        defaultOptions: {
          queries: { retry: shouldRetry, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      }),
  )

  useEffect(() => {
    const handler = () => {
      queryClient.clear()
      expireSession()
    }
    window.addEventListener(SESSION_EXPIRED, handler)
    return () => window.removeEventListener(SESSION_EXPIRED, handler)
  }, [queryClient, expireSession])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}

export function Providers({ children }: ProvidersProps) {
  return (
    <I18nProvider>
      <AuthProvider>
        <QueryProvider>
          {children}
          <ToastContainer />
        </QueryProvider>
      </AuthProvider>
    </I18nProvider>
  )
}
