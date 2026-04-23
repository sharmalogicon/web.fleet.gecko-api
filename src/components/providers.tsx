'use client'

import { type ReactNode } from 'react'
import { ToastContainer } from '@/components/shared/Toast'
import { I18nProvider } from '@/i18n/I18nContext'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <I18nProvider>
      {children}
      <ToastContainer />
    </I18nProvider>
  )
}
