'use client'
import type { UseFormReturn } from 'react-hook-form'
import type { AccidentFormValues } from '@/lib/api/fleet/accidents'
import { useT } from '@/i18n/I18nContext'

interface Props {
  form: UseFormReturn<AccidentFormValues>
  editable: boolean
}

function Field({ label, error, children, fullWidth }: { label: string; error?: string; children: React.ReactNode; fullWidth?: boolean }) {
  const { t } = useT()
  return (
    <div className={`flex flex-col gap-1${fullWidth ? ' sm:col-span-2 lg:col-span-3' : ''}`}>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{t(error)}</p>}
    </div>
  )
}

function ic(ro?: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none ${
    ro ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500'
  }`
}

/** Same three fields; country is the 2-letter code the API keeps (countryCode). */
export function AccidentLocationSection({ form, editable }: Props) {
  const { t } = useT()
  const { register, formState: { errors } } = form
  const ro = !editable

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label={t('form.address')} fullWidth error={errors.address?.message}>
        <textarea {...register('address')} rows={2} disabled={ro} className={`${ic(ro)} resize-none`} placeholder="Street address or landmark" />
      </Field>

      <Field label={t('form.city')} error={errors.city?.message}>
        <input {...register('city')} disabled={ro} className={ic(ro)} placeholder="e.g. Bangkok" />
      </Field>

      <Field label={t('form.country')} error={errors.country?.message}>
        <input {...register('country')} disabled={ro} maxLength={2} className={`${ic(ro)} uppercase`} placeholder="e.g. TH" />
      </Field>
    </div>
  )
}
