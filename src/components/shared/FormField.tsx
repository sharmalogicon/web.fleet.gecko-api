'use client'

import type { ReactNode } from 'react'
import { useT } from '@/i18n/I18nContext'

/** The Master forms' Field / inputClass (Driver style), with the message translated (zod rules use i18n keys). */
export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  const { t } = useT()
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error ? <p className="text-xs text-red-500">{t(error)}</p> : hint ? <p className="text-xs text-gray-400">{hint}</p> : null}
    </div>
  )
}

export function inputClass(hasError?: boolean, disabled?: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    hasError ? 'border-red-400' : 'border-gray-300'
  } ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}`
}
