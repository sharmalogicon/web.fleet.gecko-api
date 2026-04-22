'use client'

import { type ReactNode } from 'react'
import { ToastContainer } from '@/components/shared/Toast'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <>
      {children}
      <ToastContainer />
    </>
  )
}
