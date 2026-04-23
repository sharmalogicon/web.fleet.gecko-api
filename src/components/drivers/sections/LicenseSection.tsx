'use client'

import { useMemo } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { DriverFormValues } from '@/types/driver'
import { isDateExpired, formatDate } from '@/lib/utils/driver'

interface LicenseSectionProps {
  form: UseFormReturn<DriverFormValues>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function inputClass(hasError?: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    hasError ? 'border-red-400' : 'border-gray-300'
  }`
}

export function LicenseSection({ form }: LicenseSectionProps) {
  const { register, watch } = form
  const expiryValue = watch('licenseExpiryDate')
  const expired = useMemo(() => isDateExpired(expiryValue), [expiryValue])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="License No.">
        <input {...register('licenseNo')} className={inputClass()} placeholder="License number" />
      </Field>

      <Field label="License Expiry Date">
        <input type="date" {...register('licenseExpiryDate')} className={inputClass()} />
      </Field>

      {expiryValue && (
        <div className="sm:col-span-2">
          {expired ? (
            <p className="text-xs text-red-600 font-medium">
              ⚠ License expired on {formatDate(expiryValue)}
            </p>
          ) : (
            <p className="text-xs text-green-700">
              License valid — expires {formatDate(expiryValue)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
