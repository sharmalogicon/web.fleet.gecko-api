'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { DriverFormValues } from '@/types/driver'
import { useT } from '@/i18n/I18nContext'

interface EmergencyContactSectionProps {
  form: UseFormReturn<DriverFormValues>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  )
}

function inputClass() {
  return 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
}

export function EmergencyContactSection({ form }: EmergencyContactSectionProps) {
  const { t } = useT()
  const { register } = form

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label={t('form.contactPerson')}>
        <input {...register('contactPerson')} className={inputClass()} placeholder="Emergency contact name" />
      </Field>

      <Field label={t('form.mobile')}>
        <input {...register('mobilePhoneNumber')} className={inputClass()} placeholder="+66 xx xxx xxxx" />
      </Field>
    </div>
  )
}
